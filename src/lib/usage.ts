// src/lib/usage.ts
import { prisma } from "@/lib/prisma";

export async function logUsage(p: {
  route: string; method: string; status: number; userId: string;
  licenseId?: string | null; tokenJti?: string | null; costMs?: number;
  note?: string; ip?: string | null;
}) {
  try {
    await prisma.apiUsage.create({
      data: {
        route: p.route, method: p.method, status: p.status,
        userId: p.userId, licenseId: p.licenseId ?? null, tokenJti: p.tokenJti ?? null,
        costMs: p.costMs ?? null, note: p.note ?? null, ip: p.ip ?? null,
      },
    });
  } catch (e) {
    console.error("[ApiUsage] log failed", e);
  }
}
