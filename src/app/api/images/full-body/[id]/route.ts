export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { s3, BUCKET } from "@/lib/s3";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";

type Params = { params: { id: string } };

export async function DELETE(_req: Request, { params }: Params) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = params;

  // 1) Find the image and verify ownership
  const img = await prisma.image.findFirst({
    where: { id, userId, kind: "full_body" },
  });
  if (!img) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // 2) Delete from R2 (ignore NotFound errors)
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: img.bucketKey }));
  } catch (e) {
    // If the object is already gone, continue with DB delete.
    // Optionally log e for observability.
  }

  // 3) Remove from DB
  await prisma.image.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
