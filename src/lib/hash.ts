//src/lib/hash.ts
// Small helpers to normalize and hash URLs consistently
import crypto from "node:crypto";

export function normalizeUrl(u: string): string {
  // Make as deterministic as possible; adjust to your needs
  const url = new URL(u);
  url.hash = ""; // ignore fragment
  // remove common cache-buster params
  ["_","cache","cb","v","ver","version"].forEach(k => url.searchParams.delete(k));
  // lower-case host, keep path/query as-is
  url.host = url.host.toLowerCase();
  return url.toString();
}

export function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}
