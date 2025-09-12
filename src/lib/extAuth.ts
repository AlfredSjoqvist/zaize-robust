// src/lib/extAuth.ts
import jwt, { type SignOptions } from "jsonwebtoken";
import crypto from "node:crypto";

export type ExtUser = { uid: string; email?: string | null };

/** Optional: old helper kept for compatibility */
export function signExtJwt(payload: ExtUser, expiresIn: string | number = "7d") {
  const secret = process.env.EXT_JWT_SECRET;
  if (!secret) throw new Error("EXT_JWT_SECRET missing");
  const options: SignOptions = { expiresIn: expiresIn as unknown as SignOptions["expiresIn"] };
  return jwt.sign(payload, secret, options);
}

/**
 * NEW: Mint a per-user JWT with a JTI (so you can optionally store/revoke later).
 * Returns the raw token and its jti.
 */
export function mintExtToken(
  userId: string,
  email?: string | null,
  opts?: { ttl?: string | number; licenseId?: string }
): { token: string; jti: string } {
  const secret = process.env.EXT_JWT_SECRET;
  if (!secret) throw new Error("EXT_JWT_SECRET missing");

  const jti = crypto.randomUUID();
  const payload: Record<string, any> = { uid: userId, email: email ?? undefined, jti };
  if (opts?.licenseId) payload.lic = opts.licenseId;

  const options: SignOptions = {
    expiresIn: (opts?.ttl ?? "14d") as unknown as SignOptions["expiresIn"],
  };

  const token = jwt.sign(payload, secret, options);
  return { token, jti };
}

export async function verifyExtBearer(req: Request): Promise<ExtUser | null> {
  try {
    const auth = req.headers.get("authorization") || req.headers.get("Authorization");
    if (!auth || !auth.startsWith("Bearer ")) return null;

    const token = auth.slice("Bearer ".length).trim();
    const secret = process.env.EXT_JWT_SECRET;
    if (!secret) throw new Error("EXT_JWT_SECRET missing");

    const decoded = jwt.verify(token, secret) as jwt.JwtPayload & {
      uid?: string;
      sub?: string;
      email?: string | null;
      jti?: string;
      lic?: string;
    };

    const uid = decoded.uid || decoded.sub || null;
    if (!uid) return null;

    // (Optional) If you later add a table for revocation, check decoded.jti here.
    return { uid, email: decoded.email ?? null };
  } catch {
    return null;
  }
}
