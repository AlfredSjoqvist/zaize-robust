//src/app/api/tryon/route.ts

export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyExtToken } from "@/lib/ext-jwt";
import { createHash } from "crypto";

const FASHN_API = "https://api.fashn.ai/v1";
const FASHN_KEY = process.env.FASHN_API_KEY;

function withCors(req: Request, res: Response) {
  const origin = req.headers.get("Origin") || "*";
  const headers = new Headers(res.headers);
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Vary", "Origin");
  headers.set("Access-Control-Allow-Credentials", "true");
  headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
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

const sha256Hex = (s: string) => createHash("sha256").update(s).digest("hex");
const normalize = (u: string) => u.trim();

export async function POST(req: Request) {
  try {
    if (!FASHN_KEY) {
      return withCors(
        req,
        NextResponse.json(
          { error: "missing_env", message: "FASHN_API_KEY is not set on the server" },
          { status: 500 }
        )
      );
    }

    // MVP auth: use extension token if present; if invalid, still continue
    const auth = req.headers.get("authorization") || "";
    let userId: string | null = null;
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (m) {
      try {
        const claims = await verifyExtToken(m[1]);
        userId = claims?.sub ?? null;
      } catch {
        // ignore for MVP
      }
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

    const modelUrl = normalize(model_url);
    const garmentUrl = normalize(garment_url);
    const keyHash = sha256Hex(`${sha256Hex(modelUrl)}|${sha256Hex(garmentUrl)}`);

    // Cache hit?
    const existing = await prisma.tryOnResult.findUnique({ where: { keyHash } });
    if (existing?.status === "completed" && existing.resultUrl) {
      return withCors(
        req,
        NextResponse.json({ cached: true, result_url: existing.resultUrl, id: existing.id }, { status: 200 })
      );
    }

    // Create row if needed
    const row =
      existing ??
      (await prisma.tryOnResult.create({
        data: {
          userId,
          modelUrl,
          garmentUrl,
          modelHash: sha256Hex(modelUrl),
          garmentHash: sha256Hex(garmentUrl),
          keyHash,
          status: "pending",
        },
      }));

    // Start job if we haven’t
    let jobId = row.apiJobId;
    if (!jobId) {
      const runResp = await fetch(`${FASHN_API}/run`, {
        method: "POST",
        headers: { Authorization: `Bearer ${FASHN_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model_name: "tryon-v1.6",
          inputs: { model_image: modelUrl, garment_image: garmentUrl },
          category,
          moderation_level,
          mode,
        }),
      });
      const runJson = await runResp.json().catch(() => ({}));
      if (!runResp.ok || !runJson?.id) {
        await prisma.tryOnResult.update({
          where: { id: row.id },
          data: { status: "failed", error: JSON.stringify(runJson || { status: runResp.status }) },
        });
        return withCors(
          req,
          NextResponse.json({ error: "fashn_run_failed", details: runJson }, { status: 502 })
        );
      }
      jobId = runJson.id as string;
      await prisma.tryOnResult.update({ where: { id: row.id }, data: { apiJobId: jobId } });
    }

    // Short poll (up to ~30s)
    const pollUrl = `${FASHN_API}/status/${jobId}`;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      const sRes = await fetch(pollUrl, { headers: { Authorization: `Bearer ${FASHN_KEY}` } });
      const sJson = await sRes.json().catch(() => ({}));

      if (sJson?.status === "completed") {
        const out: string | undefined = sJson?.output?.[0];
        if (!out) {
          await prisma.tryOnResult.update({
            where: { id: row.id },
            data: { status: "failed", error: "completed_no_output" },
          });
          return withCors(req, NextResponse.json({ error: "completed_but_no_output" }, { status: 502 }));
        }
        await prisma.tryOnResult.update({
          where: { id: row.id },
          data: { status: "completed", resultUrl: out },
        });
        return withCors(req, NextResponse.json({ cached: false, result_url: out, id: row.id }, { status: 200 }));
      }

      if (sJson?.status === "failed") {
        await prisma.tryOnResult.update({
          where: { id: row.id },
          data: { status: "failed", error: JSON.stringify(sJson?.error ?? sJson) },
        });
        return withCors(req, NextResponse.json({ error: "fashn_failed", details: sJson }, { status: 502 }));
      }
    }

    // Still pending — let content.js repoll (your loader already waits)
    return withCors(req, NextResponse.json({ pending: true, id: row.id }, { status: 202 }));
  } catch (e: any) {
    console.error("[/api/tryon] error:", e?.message || e);
    // MVP: surface message but never 500 without body
    return withCors(
      req,
      NextResponse.json({ error: "server_error", message: e?.message ?? "unknown" }, { status: 500 })
    );
  }
}
