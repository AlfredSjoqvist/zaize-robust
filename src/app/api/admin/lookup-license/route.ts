import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashKey } from "@/lib/license";

export const runtime = "nodejs"; // prisma needs node runtime

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : auth.trim();
  if (token !== process.env.ADMIN_MINT_SECRET) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { productKey } = await req.json().catch(() => ({}));
  if (!productKey) {
    return NextResponse.json({ error: "missing_params" }, { status: 400 });
  }
  const lic = await prisma.licenseKey.findUnique({
    where: { codeHash: hashKey(productKey) },
  });
  return NextResponse.json({ license: lic ?? null });
}
