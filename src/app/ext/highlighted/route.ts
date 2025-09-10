//src/app/ext/highlighted/route.ts

export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { verifyExtToken } from "@/lib/ext-jwt";
import { prisma } from "@/lib/prisma";

// Very permissive CORS for this read-only endpoint (optional but helpful)
function withCors(res: Response) {
  const headers = new Headers(res.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
  return new Response(res.body, { status: res.status, headers });
}

export async function OPTIONS() {
  return withCors(new Response(null, { status: 204 }));
}

export async function GET(req: Request) {
  try {
    const auth = req.headers.get("authorization") || "";
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (!m) return withCors(NextResponse.json({ error: "missing_bearer" }, { status: 401 }));

    const claims = await verifyExtToken(m[1]).catch(() => null);
    if (!claims || claims.scope !== "read:highlighted" || !claims.sub) {
      return withCors(NextResponse.json({ error: "invalid_token" }, { status: 401 }));
    }

    const userId = claims.sub;

    const img = await prisma.image.findFirst({
      where: { userId, kind: "full_body", primary: true },
      select: { id: true, url: true, bucketKey: true, createdAt: true },
    });

    return withCors(NextResponse.json({ image: img ?? null }));
  } catch (e) {
    return withCors(NextResponse.json({ error: "server_error" }, { status: 500 }));
  }
}
