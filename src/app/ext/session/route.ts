//src/app/ext/session/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";

/** CORS helper: allow credentials from your extension context */
function withCors(res: Response) {
  const headers = new Headers(res.headers);
  // IMPORTANT: do NOT use "*" when sending credentials
  headers.set("Access-Control-Allow-Origin", "https://www.bjornborg.com"); // add more origins if needed
  headers.set("Vary", "Origin");
  headers.set("Access-Control-Allow-Credentials", "true");
  headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  return new Response(res.body, { status: res.status, headers });
}

export async function OPTIONS() {
  return withCors(new Response(null, { status: 204 }));
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions as any);
  if (!session?.user) {
    return withCors(NextResponse.json({ loggedIn: false }, { status: 401 }));
  }
  return withCors(NextResponse.json({ loggedIn: true }, { status: 200 }));
}
