//src/app/api/tryon/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyExtToken } from "@/lib/ext-jwt";
import { normalizeUrl, sha256Hex } from "@/lib/hash";

const FASHN_API = "https://api.fashn.ai/v1";
const FASHN_KEY = process.env.FASHN_API_KEY!;

/** CORS allowing your retail sites (demo) */
function withCors(req: Request, res: Response) {
  const origin = req.headers.get("Origin") || "";
  const ALLOW = new Set<string>([
    "https://www.bjornborg.com",
    // add other demo origins if needed
  ]);
  const headers = new Headers(res.headers);
  if (ALLOW.has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Credentials", "true");
    headers.set("Vary", "Origin");
    headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
  }
  return new Response(res.body, { status: res.status, headers });
}

export async function OPTIONS(req: Request) {
  return withCors(req, new Response(null, { status: 204 }));
}

type Body = {
  model_url: string;
  garment_url: string;
  category?: "auto";
  moderation_level?: "none" | "standard";
  mode?: "balanced" | "fast" | "high-quality";
};

export async function POST(req: Request) {
  try {
    // 🔐 MVP auth: extension JWT ONLY (no NextAuth cookie check)
    const auth = req.headers.get("authorization") || "";
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (!m) {
      return withCors(req, NextResponse.json({ error: "missing_bearer" }, { status: 401 }));
    }
    const claims = await verifyExtToken(m[1]);
    if (!claims) {
      return withCors(req, NextResponse.json({ error: "invalid_token" }, { status: 401 }));
    }

    const {
      model_url,
      garment_url,
      category = "auto",
      moderation_level = "none",
      mode = "balanced",
    } = (await req.json()) as Body;

    if (!model_url || !garment_url) {
      return withCors(req, NextResponse.json({ error: "missing_params" }, { status: 400 }));
    }

    const modelUrlNorm = normalizeUrl(model_url);
    const garmentUrlNorm = normalizeUrl(garment_url);
    const modelHash = sha256Hex(modelUrlNorm);
    const garmentHash = sha256Hex(garmentUrlNorm);
    const keyHash = sha256Hex(`${modelHash}|${garmentHash}`);

    // Cache hit?
    const existing = await prisma.tryOnResult.findUnique({ where: { keyHash } });
    if (existing?.status === "completed" && existing.resultUrl) {
      return withCors(
        req,
        NextResponse.json({ cached: true, result_url: existing.resultUrl, id: existing.id })
      );
    }

    // Create or reuse pending row
    const row =
      existing ??
      (await prisma.tryOnResult.create({
        data: {
          userId: claims.sub, // optional
          modelUrl: modelUrlNorm,
          garmentUrl: garmentUrlNorm,
          modelHash,
          garmentHash,
          keyHash,
          status: "pending",
        },
      }));

    // Submit to FASHN if needed
    let apiJobId = row.apiJobId;
    if (!apiJobId) {
      const runRes = await fetch(`${FASHN_API}/run`, {
        method: "POST",
        headers: { Authorization: `Bearer ${FASHN_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model_name: "tryon-v1.6",
          inputs: { model_image: modelUrlNorm, garment_image: garmentUrlNorm },
          category,
          moderation_level,
          mode,
        }),
      }).then((r) => r.json());

      if (!runRes?.id) {
        await prisma.tryOnResult.update({
          where: { id: row.id },
          data: { status: "failed", error: JSON.stringify(runRes) },
        });
        return withCors(req, NextResponse.json({ error: "fashn_run_failed", details: runRes }, { status: 502 }));
      }

      apiJobId = runRes.id as string;
      await prisma.tryOnResult.update({ where: { id: row.id }, data: { apiJobId } });
    }

    // Poll
    const pollUrl = `${FASHN_API}/status/${apiJobId}`;
    const maxTries = 30;
    for (let i = 0; i < maxTries; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      const statusRes = await fetch(pollUrl, {
        headers: { Authorization: `Bearer ${FASHN_KEY}` },
      }).then((r) => r.json());

      if (statusRes?.status === "completed") {
        const outUrl: string | undefined = statusRes?.output?.[0];
        if (!outUrl) {
          await prisma.tryOnResult.update({
            where: { id: row.id },
            data: { status: "failed", error: "completed_no_output" },
          });
          return withCors(req, NextResponse.json({ error: "completed_but_no_output" }, { status: 502 }));
        }

        await prisma.tryOnResult.update({
          where: { id: row.id },
          data: { status: "completed", resultUrl: outUrl },
        });

        return withCors(req, NextResponse.json({ cached: false, result_url: outUrl, id: row.id }));
      }

      if (statusRes?.status === "failed") {
        await prisma.tryOnResult.update({
          where: { id: row.id },
          data: { status: "failed", error: JSON.stringify(statusRes?.error ?? statusRes) },
        });
        return withCors(req, NextResponse.json({ error: "fashn_failed", details: statusRes }, { status: 502 }));
      }
    }

    return withCors(req, NextResponse.json({ pending: true, id: row.id }, { status: 202 }));
  } catch (e: any) {
    return withCors(req, NextResponse.json({ error: "server_error", message: e?.message }, { status: 500 }));
  }
}
