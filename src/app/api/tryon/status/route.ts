// src/app/api/tryon/status/route.ts
import { NextResponse } from "next/server";
import { withCors, preflight } from "@/lib/cors";
import { verifyExtBearer } from "@/lib/extAuth";
import { prisma } from "@/lib/prisma";

const FASHN_API = "https://api.fashn.ai/v1";

export async function GET(req: Request) {
  const origin = req.headers.get("origin") || "*";
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return withCors(
      NextResponse.json({ error: "missing_id" }, { status: 400 }),
      origin
    );
  }

  // Verify extension JWT (user must be known)
  const user = await verifyExtBearer(req);
  if (!user) {
    return withCors(
      NextResponse.json({ error: "unauthorized" }, { status: 401 }),
      origin
    );
  }

  // 1) Look in DB first (fast path)
  const cached = await prisma.tryOnResult.findFirst({
    where: { apiJobId: id, userId: user.uid },
  });

  if (cached?.status === "completed" && cached.resultUrl) {
    return withCors(
      NextResponse.json(
        { status: "completed", result_url: cached.resultUrl, id },
        { status: 200 }
      ),
      origin
    );
  }

  if (cached?.status === "failed") {
    return withCors(
      NextResponse.json(
        { status: "failed", error: cached.error ?? "failed", id },
        { status: 200 }
      ),
      origin
    );
  }

  // 2) Proxy to Fashn status
  const r = await fetch(`${FASHN_API}/status/${id}`, {
    headers: { Authorization: `Bearer ${process.env.FASHN_API_KEY}` },
    cache: "no-store",
  });

  if (!r.ok) {
    return withCors(
      NextResponse.json({ status: "processing" }, { status: 200 }),
      origin
    );
  }

  const data = await r.json();

  // 3) Persist transitions when completed/failed
  if (data?.status === "completed" && data?.output?.[0]) {
    const resultUrl = data.output[0];

    await prisma.tryOnResult.updateMany({
      where: { apiJobId: id, userId: user.uid },
      data: { status: "completed", resultUrl, error: null },
    });

    return withCors(
      NextResponse.json({ status: "completed", result_url: resultUrl, id }, { status: 200 }),
      origin
    );
  }

  if (data?.status === "failed") {
    const errorMsg = typeof data?.error === "string" ? data.error : "failed";
    await prisma.tryOnResult.updateMany({
      where: { apiJobId: id, userId: user.uid },
      data: { status: "failed", error: errorMsg },
    });

    return withCors(
      NextResponse.json({ status: "failed", error: errorMsg, id }, { status: 200 }),
      origin
    );
  }

  // Otherwise still running
  return withCors(
    NextResponse.json({ status: "processing", id }, { status: 200 }),
    origin
  );
}

export function OPTIONS(req: Request) {
  const origin = req.headers.get("origin") || "*";
  return preflight(origin);
}
