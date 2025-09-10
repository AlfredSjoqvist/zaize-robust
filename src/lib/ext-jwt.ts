//src/lib/ext-jwt.ts
import { SignJWT, jwtVerify, type JWTPayload } from "jose";

const EXT_SECRET = new TextEncoder().encode(process.env.EXT_JWT_SECRET!);

type ExtScope = "read:highlighted";
export type ExtClaims = JWTPayload & {
  sub: string;
  scope: ExtScope;
  iss: "zaize-ext";
  aud: "zaize-extension";
};

export async function signExtToken(userId: string, ttlSeconds = 1200) {
  return await new SignJWT({ scope: "read:highlighted" satisfies ExtScope })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(userId)
    .setIssuer("zaize-ext")
    .setAudience("zaize-extension")
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(EXT_SECRET);
}

export async function verifyExtToken(token: string) {
  const { payload } = await jwtVerify(token, EXT_SECRET, {
    issuer: "zaize-ext",
    audience: "zaize-extension",
    // clockTolerance: "5s", // optional
  });
  return payload as ExtClaims;
}
