//src/app/ext/highlighted/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { verifyExtToken } from "@/lib/ext-jwt";
import { prisma } from "@/lib/prisma";

/** Reflect caller origin and allow Authorization for preflight */
function withCors(req: Request, res: Response) {
  const origin = req.headers.get("Origin") || "*";
  const headers = new Headers(res.headers);
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Vary", "Origin");
  headers.set("Access-Control-Allow-Credentials", "true");
  headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
  return new Response(res.body, { status: res.status, headers });
}

export async function OPTIONS(req: Request) {
  return withCors(req, new Response(null, { status: 204 }));
}

export async function GET(req: Request) {
  try {
    const auth = req.headers.get("authorization") || "";
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (!m) {
      return withCors(req, NextResponse.json({ error: "missing_bearer" }, { status: 401 }));
    }

    const claims = await verifyExtToken(m[1]);
    if (!claims) {
      return withCors(req, NextResponse.json({ error: "invalid_token" }, { status: 401 }));
    }

    const img = await prisma.image.findFirst({
      where: { userId: claims.sub, kind: "full_body", primary: true },
      select: { id: true, url: true },
    });

    return withCors(req, NextResponse.json({ image: img ?? null }));
  } catch (e: any) {
    // Optional: surface message during MVP to debug
    return withCors(
      req,
      NextResponse.json({ error: "server_error", message: e?.message ?? "unknown" }, { status: 500 })
    );
  }
}
