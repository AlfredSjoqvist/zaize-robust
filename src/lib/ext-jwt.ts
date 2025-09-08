import { SignJWT, jwtVerify } from "jose";

const EXT_SECRET = new TextEncoder().encode(process.env.EXT_JWT_SECRET!);
// keep it separate from NEXTAUTH_SECRET so you can rotate independently

export type ExtClaims = { sub: string; scope: "read:highlighted"; };

export async function signExtToken(userId: string, ttlSeconds = 600) {
  return await new SignJWT({ scope: "read:highlighted" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(EXT_SECRET);
}

export async function verifyExtToken(token: string) {
  const { payload } = await jwtVerify(token, EXT_SECRET);
  return payload as unknown as ExtClaims;
}
