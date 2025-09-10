//src/app/ext/highlighted/route.ts

export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyExtToken } from "@/lib/ext-jwt";

/** CORS helper: reflect origin & allow Authorization */
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

    // MVP rule: if there’s no bearer or it’s invalid → just return {image:null} (no 500s)
    if (!m) {
      return withCors(req, NextResponse.json({ image: null }, { status: 200 }));
    }

    let userId: string | null = null;
    try {
      const claims = await verifyExtToken(m[1]);
      userId = claims?.sub ?? null;
    } catch {
      return withCors(req, NextResponse.json({ image: null }, { status: 200 }));
    }
    if (!userId) {
      return withCors(req, NextResponse.json({ image: null }, { status: 200 }));
    }

    const img = await prisma.image.findFirst({
      where: { userId, kind: "full_body", primary: true },
      select: { id: true, url: true },
    });

    return withCors(req, NextResponse.json({ image: img ?? null }, { status: 200 }));
  } catch (e: any) {
    // MVP: never leak a 500 to the extension — return null image
    console.error("[/ext/highlighted] error:", e?.message || e);
    return withCors(req, NextResponse.json({ image: null }, { status: 200 }));
  }
}
