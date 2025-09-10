//src/app/api/ext/token/route.ts
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { signExtToken } from "@/lib/ext-jwt";

export async function GET() {
  const session = await getServerSession(authOptions as any);
  const userId = (session as any)?.user?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const token = await signExtToken(userId, 600);
  return NextResponse.json({ token });
}
