// app/api/admin/create-keys/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashKey } from "@/lib/license";

function genKey() {
  const base32 = "ABCDEFGHJKLMNPQRSTUVWXZY23456789"; // no 0,O,1,I
  const rnd = (n: number) => Array.from({ length: n }, () => base32[Math.floor(Math.random()*base32.length)]).join("");
  return `ZAIZE-${rnd(5)}-${rnd(5)}-${rnd(5)}-${rnd(5)}`;
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const [, sec] = auth.split(" ");
  if (sec !== process.env.ADMIN_MINT_SECRET) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { count = 1, maxActivations = 1, expiresAt, label, userId, email } = await req.json().catch(() => ({}));
  const keys: string[] = [];
  for (let i = 0; i < count; i++) {
    const raw = genKey();
    await prisma.licenseKey.create({
      data: {
        codeHash: hashKey(raw),
        maxActivations,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        label: label ?? null,
        userId: userId ?? null,
        email: email ?? null,
      },
    });
    keys.push(raw);
  }
  return NextResponse.json({ keys });
}