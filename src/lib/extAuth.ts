// src/lib/extAuth.ts
import jwt, { type SignOptions } from "jsonwebtoken";
import crypto from "node:crypto";

export type ExtUser = {
  uid: string;
  email?: string | null;
  licenseId?: string | null;  // << we return this
  jti?: string | null;        // optional but useful
};


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
  const secret = process.env.EXT_JWT_SECRET!;
  const jti = crypto.randomUUID();

  // IMPORTANT: include 'lic' in the payload
  const payload: Record<string, any> = { uid: userId, email: email ?? undefined, jti };
  if (opts?.licenseId) payload.lic = opts.licenseId;

  const options: SignOptions = { expiresIn: (opts?.ttl ?? "14d") as any };
  return { token: jwt.sign(payload, secret, options), jti };
}

export async function verifyExtBearer(req: Request): Promise<ExtUser | null> {
  try {
    const auth = req.headers.get("authorization") || req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return null;

    const token = auth.slice(7).trim();
    const secret = process.env.EXT_JWT_SECRET!;

    const dec = jwt.verify(token, secret) as jwt.JwtPayload & {
      uid?: string; sub?: string; email?: string | null; jti?: string; lic?: string;
    };

    const uid = dec.uid || dec.sub;
    if (!uid) return null;

    return {
      uid,
      email: dec.email ?? null,
      licenseId: dec.lic ?? null,  // << hand it back to routes
      jti: dec.jti ?? null,
    };
  } catch {
    return null;
  }
}

