// src/lib/cors.ts
import { NextResponse } from "next/server";

const ALLOWED_ORIGINS = [
  "https://www.bjornborg.com",
  "https://zaize-robust.vercel.app",
  "chrome-extension://*", // if you ever need it
];

function corsHeaders(origin?: string | null) {
  const allowOrigin =
    origin && (ALLOWED_ORIGINS.includes(origin) || origin.startsWith("chrome-extension://"))
      ? origin
      : "*";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS,PATCH,PUT,DELETE",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
    "Vary": "Origin",
  };
}

export function withCors(res: NextResponse, origin?: string | null) {
  const headers = corsHeaders(origin);
  Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

export function preflight(origin?: string | null) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(origin),
  });
}
