// src/app/api/admin/create-keys/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { genKey, hashKey } from "@/lib/license";

export const runtime = "nodejs"; // IMPORTANT for Prisma + node:crypto

function json(data: any, status = 200) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(req: NextRequest) {
  try {
    // Accept either "Bearer <secret>" or just "<secret>"
    const rawAuth =
      req.headers.get("authorization") || req.headers.get("Authorization") || "";
    const token = rawAuth.startsWith("Bearer ")
      ? rawAuth.slice(7).trim()
      : rawAuth.trim();

    const expected = process.env.ADMIN_MINT_SECRET;
    if (!expected) return json({ error: "server_misconfig: ADMIN_MINT_SECRET" }, 500);
    if (token !== expected) return json({ error: "forbidden" }, 403);

    const body = await req.json().catch(() => ({} as any));
    const count = Number(body.count ?? 1);
    const maxActivations = Number(body.maxActivations ?? 1);
    const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
    const label = body.label ?? null;
    const userId = body.userId ?? null;
    const email = body.email ?? null;

    if (!Number.isFinite(count) || count < 1) {
      return json({ error: "invalid_count" }, 400);
    }

    const keys: string[] = [];
    for (let i = 0; i < count; i++) {
      const raw = genKey();              // pretty human key
      const codeHash = hashKey(raw);     // store only hash
      await prisma.licenseKey.create({
        data: { codeHash, maxActivations, expiresAt, label, userId, email },
      });
      keys.push(raw);
    }

    return json({ keys }, 200);
  } catch (e: any) {
    console.error("[create-keys] error:", e);
    return json({ error: "server_error", details: String(e?.message || e) }, 500);
  }
}

// Optional: allow GET to quickly check the route is alive
export async function GET() {
  return new NextResponse("OK\n", { status: 200 });
}
