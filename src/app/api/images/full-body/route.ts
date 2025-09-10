//src/app/api/images/full-body/route.ts

export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const imgs = await prisma.image.findMany({
    where: { userId, kind: "full_body" },
    orderBy: [{ primary: "desc" }, { createdAt: "desc" }],
  });
  return NextResponse.json(imgs);
}

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { key, url, width, height, bytes } = await req.json();
  const img = await prisma.image.create({
    data: { userId, kind: "full_body", bucketKey: key, url, width, height, bytes },
  });
  return NextResponse.json(img);
}
