// src/lib/extAuth.ts
import jwt, { type SignOptions } from "jsonwebtoken";

export type ExtUser = { uid: string; email?: string | null };

export function signExtJwt(payload: ExtUser, expiresIn: string | number = "7d") {
  const secret = process.env.EXT_JWT_SECRET;
  if (!secret) throw new Error("EXT_JWT_SECRET missing");

  // Some jsonwebtoken type versions are stricter; cast to keep TS happy across v8/v9.
  const options: SignOptions = { expiresIn: expiresIn as unknown as SignOptions["expiresIn"] };
  return jwt.sign(payload, secret, options);
}

export async function verifyExtBearer(req: Request): Promise<ExtUser | null> {
  try {
    const auth = req.headers.get("authorization") || req.headers.get("Authorization");
    if (!auth || !auth.startsWith("Bearer ")) return null;

    const token = auth.slice("Bearer ".length).trim();
    const secret = process.env.EXT_JWT_SECRET;
    if (!secret) throw new Error("EXT_JWT_SECRET missing");

    const decoded = jwt.verify(token, secret) as ExtUser & jwt.JwtPayload;
    if (!decoded?.uid) return null;

    return { uid: decoded.uid, email: decoded.email ?? null };
  } catch {
    return null;
  }
}
