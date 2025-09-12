// src/app/api/ext/redeem/route.ts
import { NextRequest, NextResponse } from "next/server";
import { consumeLicense } from "@/lib/license";
import { mintExtToken } from "@/lib/extAuth";
import { withCors, preflight } from "@/lib/cors";

export function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin");
  const reqHdrs = req.headers.get("access-control-request-headers");
  return preflight(origin, reqHdrs);
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  const { productKey, email, deviceId } = await req.json().catch(() => ({}));

  if (!productKey || !deviceId) {
    return withCors(NextResponse.json({ error: "missing_params" }, { status: 400 }), origin);
  }

  try {
    const lic = await consumeLicense(productKey, deviceId, email);
    const userId = lic.userId ?? (email ?? `anon-${lic.id}`);
    const { token } = mintExtToken(userId, email, { ttl: "14d", licenseId: lic.id });
    return withCors(NextResponse.json({ token, userId }), origin);
  } catch (e: any) {
    return withCors(NextResponse.json({ error: String(e.message || "redeem_failed") }, { status: 400 }), origin);
  }
}
