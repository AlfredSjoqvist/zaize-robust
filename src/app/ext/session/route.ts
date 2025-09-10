//src/app/ext/session/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServerSession, type Session } from "next-auth";
import { authOptions } from "@/server/auth";

/** CORS helper: allow credentials from your retail origins */
function withCors(req: Request, res: Response) {
  const origin = req.headers.get("Origin") || "";
  const ALLOW = new Set<string>([
    "https://www.bjornborg.com",
    // add other partner origins here
  ]);

  const headers = new Headers(res.headers);
  if (ALLOW.has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Credentials", "true");
    headers.set("Vary", "Origin");
    headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type");
  }
  return new Response(res.body, { status: res.status, headers });
}

export async function OPTIONS(req: Request) {
  return withCors(req, new Response(null, { status: 204 }));
}

export async function GET(req: Request) {
  // Make the type explicit so TS knows `user` exists on Session
  const session = (await getServerSession(authOptions)) as Session | null;

  if (!session?.user) {
    return withCors(req, NextResponse.json({ loggedIn: false }, { status: 401 }));
  }

  return withCors(req, NextResponse.json({ loggedIn: true }, { status: 200 }));
}
