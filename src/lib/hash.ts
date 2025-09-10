// src/lib/hash.ts
import crypto from "node:crypto";

// Normalize URLs so that trivial differences (fragments, cache-busters) don’t create different hashes
export function normalizeUrl(u: string): string {
  try {
    const url = new URL(u);
    url.hash = ""; // ignore fragment
    // remove common cache-buster params
    ["_", "cache", "cb", "v", "ver", "version"].forEach((k) =>
      url.searchParams.delete(k)
    );
    // normalize host casing
    url.host = url.host.toLowerCase();
    return url.toString();
  } catch {
    return (u || "").trim();
  }
}

// SHA-256 hex digest
export function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

// SHA-1 hex digest (shorter, fine for IDs)
export function sha1Hex(input: string): string {
  return crypto.createHash("sha1").update(input, "utf8").digest("hex");
}

// Deterministic keyHash for a given user + modelUrl + garmentUrl
export function makeKeyHash(
  userId: string | null | undefined,
  modelUrl: string,
  garmentUrl: string
): string {
  const m = normalizeUrl(modelUrl);
  const g = normalizeUrl(garmentUrl);
  const mh = sha1Hex(m);
  const gh = sha1Hex(g);
  return sha256Hex([userId || "anon", mh, gh].join("|"));
}
