// src/app/ext/silent-token/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { authOptions } from "@/server/auth";
import { withCors, preflight } from "@/lib/cors";

import jwt from "jsonwebtoken";

// Mint a short-lived JWT the extension can use (signed with NEXTAUTH_SECRET)
function makeExtJwt(uid: string) {
  const secret = process.env.NEXTAUTH_SECRET!;
  return jwt.sign({ uid, typ: "ext" }, secret, { expiresIn: "30m" });
}

export async function POST(req: Request) {
  const origin = req.headers.get("origin") || "*";

  // Cast so TS knows this is a NextAuth Session
  const session = (await getServerSession(authOptions as any)) as Session | null;

  // In many NextAuth setups, session.user.id is added via callbacks/jwt.
  // If your type defs don’t include it, use `as any` at the access point:
  const uid = (session?.user as any)?.id as string | undefined;

  if (!uid) {
    return withCors(NextResponse.json({ error: "no_web_session" }, { status: 401 }), origin);
  }

  const token = makeExtJwt(uid);
  return withCors(NextResponse.json({ token }, { status: 200 }), origin);
}

// CORS preflight
export function OPTIONS(req: Request) {
  const origin = req.headers.get("origin") || "*";
  return preflight(origin);
}
