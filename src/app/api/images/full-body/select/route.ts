export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";

export async function PATCH(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // ✅
  const { id } = (await req.json()) as { id: string };
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  // Ensure the image belongs to the user before touching rows
  const target = await prisma.image.findFirst({
    where: { id, userId, kind: "full_body" },
    select: { id: true },
  });
  if (!target) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    await tx.image.updateMany({
      where: { userId, kind: "full_body", primary: true },
      data: { primary: false },
    });
    await tx.image.update({ where: { id }, data: { primary: true } });
  });

  // return selected id so UI can confirm
  return NextResponse.json({ selectedId: id });
}
