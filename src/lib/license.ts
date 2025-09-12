// lib/license.ts
import { prisma } from "@/lib/prisma";
import crypto from "node:crypto";

export function hashKey(raw: string) {
  return crypto.createHash("sha256").update(raw.trim()).digest("hex");
}

export async function consumeLicense(rawKey: string, deviceId: string, email?: string) {
  const codeHash = hashKey(rawKey);
  const key = await prisma.licenseKey.findUnique({ where: { codeHash } });
  if (!key || key.revoked) throw new Error("invalid_key");
  if (key.expiresAt && key.expiresAt < new Date()) throw new Error("expired_key");
  if (key.activationsUsed >= key.maxActivations) throw new Error("activation_limit");

  await prisma.licenseKey.update({
    where: { codeHash },
    data: {
      activationsUsed: { increment: 1 },
      email: email ?? key.email,
    },
  });
  return key;
}
