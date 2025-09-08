export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";

export async function PATCH(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await req.json();

  const updated = await prisma.$transaction(async (tx) => {
    await tx.image.updateMany({
      where: { userId, kind: "full_body", primary: true },
      data: { primary: false },
    });
    return tx.image.update({ where: { id }, data: { primary: true } });
  });

  return NextResponse.json(updated);
}
