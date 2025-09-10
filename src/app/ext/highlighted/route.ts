//src/app/ext/highlighted/route.ts

export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { withCors, preflight } from "@/lib/cors";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { prisma } from "@/lib/prisma";


export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return withCors(NextResponse.json({ error: "not_logged_in" }, { status: 401 }), req.headers.get("origin"));
  }

  const image = await prisma.image.findFirst({
    where: { userId: session.user.id, primary: true },
    orderBy: { createdAt: "desc" },
  });

  return withCors(NextResponse.json({ image }), req.headers.get("origin"));
}

export function OPTIONS(req: Request) {
  return preflight(req.headers.get("origin"));
}