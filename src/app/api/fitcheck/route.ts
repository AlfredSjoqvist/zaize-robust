/* eslint-disable @typescript-eslint/no-explicit-any */
// Next.js App Router handler that returns points.json + colors.json

import { NextRequest, NextResponse } from "next/server";
import { withCors, preflight } from "@/lib/cors";
import { verifyExtBearer } from "@/lib/extAuth";

// If you run Prisma elsewhere, this route doesn’t need it.
// If you want usage logs like your /api/tryon route, you can import logUsage.

export const runtime = "nodejs"; // we may call external microservice(s)

type EndUser = Record<string, number>;
type SizeGuide = Record<string, [number, number]>;

type PointsJson = Array<{ name: string; x: number; y: number }>;
type ColorsJson = Record<
  string,
  { x: number; lower: number; upper: number; y: number }
>;

const POSE_POINTS_API = process.env.POSE_POINTS_API || ""; 
// Your microservice that runs MediaPipe/OpenCV and returns {points:[...]} from an image.
// (Examples below)

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin");
  const requested = req.headers.get("access-control-request-headers");
  return preflight(origin, requested);
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin") || "*";

  // --- Auth (same pattern as your /api/tryon) ---
  let user: any = null;
    try {
    user = await verifyExtBearer(req as unknown as Request);
    } catch (_) {
    user = null;
    }

    if (!user) {
    const dev = req.headers.get("x-dev-uid");
    if (!dev) {
        return withCors(NextResponse.json({ error: "unauthorized" }, { status: 401 }), origin);
    }
    // dev bypass OK → fall through (do NOT return here)
}


  // We accept either:
  // (A) application/json { image_url, end_user, size_guide }
  // (B) multipart/form-data with: image (File), end_user (JSON string), size_guide (JSON string)

  let imageUrl: string | null = null;
  let endUser: EndUser | null = null;
  let sizeGuide: SizeGuide | null = null;
  let imageFile: File | null = null;

  const ctype = req.headers.get("content-type") || "";
  try {
    if (ctype.includes("application/json")) {
      const body = await req.json();
      imageUrl = (body?.image_url ?? "").trim() || null;
      endUser = sanitizeEndUser(body?.end_user);
      sizeGuide = sanitizeSizeGuide(body?.size_guide);
    } else if (ctype.includes("multipart/form-data")) {
      const form = await req.formData();
      const img = form.get("image");
      if (img instanceof File) imageFile = img;

      const euRaw = form.get("end_user");
      const sgRaw = form.get("size_guide");

      endUser = sanitizeEndUser(safeParseJson(euRaw));
      sizeGuide = sanitizeSizeGuide(safeParseJson(sgRaw));
      // Optionally a URL rather than a file:
      const maybeUrl = (form.get("image_url") as string | null)?.trim();
      if (maybeUrl) imageUrl = maybeUrl;
    } else {
      return withCors(NextResponse.json({ error: "unsupported_content_type" }, { status: 415 }), origin);
    }
  } catch {
    return withCors(NextResponse.json({ error: "invalid_body" }, { status: 400 }), origin);
  }

  // Basic validation
  if (!endUser || !sizeGuide) {
    return withCors(NextResponse.json({ error: "missing_json" }, { status: 400 }), origin);
  }
  if (!imageUrl && !imageFile) {
    return withCors(NextResponse.json({ error: "missing_image" }, { status: 400 }), origin);
  }

  // ---- 1) Compute colors.json locally (cheap, deterministic) ----
  const colors: ColorsJson = buildColorsMap(endUser, sizeGuide);

  // ---- 2) Get points.json from the image (via URL or file) ----
  // We recommend an external microservice (RunPod, etc.) for pose detection.
  // This keeps Vercel light and avoids native deps issues.
  let points: PointsJson | null = null;

  try {
    if (!POSE_POINTS_API) {
      // No upstream configured — return colors now and explain missing points.
      return withCors(
        NextResponse.json(
          {
            colors,
            points: null,
            note:
              "POSE_POINTS_API not configured. Provide an image_url and set POSE_POINTS_API to a service that returns {points:[{name,x,y},...]}.",
          },
          { status: 200 }
        ),
        origin
      );
    }

    // Prefer URL flow; otherwise stream the multipart file to the microservice.
    let upstreamRes: Response;
    if (imageUrl) {
      upstreamRes = await fetch(`${POSE_POINTS_API}/points`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_url: imageUrl }),
      });
    } else {
      const form = new FormData();
      form.set("image", imageFile as File, (imageFile as File).name || "image.png");
      upstreamRes = await fetch(`${POSE_POINTS_API}/points`, {
        method: "POST",
        body: form,
      });
    }

    if (!upstreamRes.ok) {
      const errText = await upstreamRes.text();
      return withCors(
        NextResponse.json({ error: "pose_upstream_error", details: errText || null, colors }, { status: 502 }),
        origin
      );
    }

    const data = (await upstreamRes.json()) as { points: PointsJson };
    if (!data?.points || !Array.isArray(data.points)) {
      return withCors(
        NextResponse.json({ error: "invalid_pose_response", colors }, { status: 502 }),
        origin
      );
    }
    points = data.points;
  } catch (e: any) {
    return withCors(
      NextResponse.json({ error: "pose_fetch_failed", details: String(e), colors }, { status: 502 }),
      origin
    );
  }

  // ---- 3) Return both payloads to the extension ----
  // The extension can persist them as files if it wants.
  return withCors(NextResponse.json({ colors, points }, { status: 200 }), origin);
}

/* ---------- Helpers: JSON parsing & validation ---------- */
function safeParseJson(v: any): any | null {
  try {
    if (typeof v === "string") return JSON.parse(v);
    return v ?? null;
  } catch {
    return null;
  }
}

function isFiniteNumber(n: any): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

function sanitizeEndUser(obj: any): EndUser | null {
  if (!obj || typeof obj !== "object") return null;
  const out: EndUser = {};
  for (const [k, v] of Object.entries(obj)) {
    if (isFiniteNumber(v)) out[k] = v;
  }
  return Object.keys(out).length ? out : null;
}

function sanitizeSizeGuide(obj: any): SizeGuide | null {
  if (!obj || typeof obj !== "object") return null;
  const out: SizeGuide = {};
  for (const [k, v] of Object.entries(obj)) {
    if (Array.isArray(v) && v.length === 2 && isFiniteNumber(v[0]) && isFiniteNumber(v[1]) && v[1] > v[0]) {
      out[k] = [v[0], v[1]];
    }
  }
  return Object.keys(out).length ? out : null;
}

/* ---------- Piecewise tanh (ported from your HTML) ---------- */
function evaluatePiecewise(x: number, LOWER_RANGE: number, UPPER_RANGE: number): number {
  const RANGE_AVG = (LOWER_RANGE + UPPER_RANGE) / 2;
  const RANGE_DIFF = UPPER_RANGE - LOWER_RANGE;
  const LOWER_SLOPE = (0.3 * 100) / RANGE_AVG;
  const UPPER_SLOPE = (0.5 * 100) / RANGE_AVG;
  const LOWER_PERC = 0.3;
  const UPPER_PERC = 0.7;
  const LOWER_BOUND = LOWER_RANGE + (UPPER_RANGE - LOWER_RANGE) * LOWER_PERC;
  const UPPER_BOUND = UPPER_RANGE - (UPPER_RANGE - LOWER_RANGE) * (1 - UPPER_PERC);
  const LOWER_TANH_CENTER_DIST = 2 / LOWER_SLOPE;
  const UPPER_TANH_CENTER_DIST = 2 / UPPER_SLOPE;

  if (x < LOWER_BOUND) {
    return (Math.tanh(LOWER_SLOPE * (x - LOWER_BOUND + LOWER_TANH_CENTER_DIST)) - 1) / 2;
  } else if (x <= UPPER_BOUND) {
    return 8 * (x - RANGE_AVG) / (RANGE_AVG * RANGE_DIFF);
  } else {
    return (Math.tanh(UPPER_SLOPE * (x - UPPER_BOUND - UPPER_TANH_CENTER_DIST)) + 1) / 2;
  }
}

function buildColorsMap(endUser: EndUser, sizeGuide: SizeGuide): ColorsJson {
  const out: ColorsJson = {};
  const keys = new Set([...Object.keys(endUser), ...Object.keys(sizeGuide)]);
  for (const key of keys) {
    const uVal = endUser[key];
    const range = sizeGuide[key];
    if (!isFiniteNumber(uVal) || !range) continue;
    const [LOWER, UPPER] = range;
    const y = evaluatePiecewise(uVal, LOWER, UPPER);
    out[key] = {
      x: Number(uVal.toFixed(6)),
      lower: Number(LOWER.toFixed(6)),
      upper: Number(UPPER.toFixed(6)),
      y: Number(y.toFixed(6)),
    };
  }
  return out;
}
