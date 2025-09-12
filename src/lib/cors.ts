// src/lib/cors.ts
import { NextResponse } from "next/server";

// Comma-separated list of extension origins in env, e.g.:
// EXTENSION_ORIGINS="chrome-extension://abc123def456,chrome-extension://devid987654"
const EXTENSION_ORIGINS = new Set(
  (process.env.EXTENSION_ORIGINS || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean)
);

// Regular web origins you want to allow
const WEB_ORIGINS = new Set([
  "https://www.bjornborg.com",
  "https://zaize-robust.vercel.app",
]);

function pickAllowedOrigin(origin?: string | null) {
  if (!origin) return null;
  if (WEB_ORIGINS.has(origin)) return origin;
  if (origin.startsWith("chrome-extension://") && EXTENSION_ORIGINS.has(origin)) return origin;
  return null;
}

function buildCorsHeaders(origin?: string | null, requestHeaders?: string | null) {
  const allowed = pickAllowedOrigin(origin);
  const headers: Record<string, string> = {
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS,PATCH,PUT,DELETE",
    // echo requested headers if present, else default to the ones we need
    "Access-Control-Allow-Headers": requestHeaders || "content-type, authorization",
  };

  if (allowed) {
    headers["Access-Control-Allow-Origin"] = allowed;
    headers["Access-Control-Allow-Credentials"] = "true";
  } else {
    // Fallback: public responses (no credentials)
    headers["Access-Control-Allow-Origin"] = "*";
    // NOTE: do NOT set Allow-Credentials when origin is "*"
  }

  return headers;
}

export function withCors(res: NextResponse, origin?: string | null) {
  const headers = buildCorsHeaders(origin);
  Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

// Keep signature similar to your current usage but allow passing the preflight headers.
export function preflight(origin?: string | null, requestHeaders?: string | null) {
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(origin, requestHeaders),
  });
}
