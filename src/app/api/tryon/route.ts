import { NextRequest, NextResponse } from "next/server";
import { withCors, preflight } from "@/lib/cors";
import { verifyExtBearer } from "@/lib/extAuth";
import { prisma } from "@/lib/prisma";
import { makeKeyHash, sha1Hex as sha1, normalizeUrl } from "@/lib/hash";

const FASHN_API = "https://api.fashn.ai/v1";

export async function POST(req: Request) {
  const origin = req.headers.get("origin") || "*";

  const user = await verifyExtBearer(req);
  if (!user) {
    return withCors(
      NextResponse.json({ error: "unauthorized" }, { status: 401 }),
      origin
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return withCors(
      NextResponse.json({ error: "invalid_json" }, { status: 400 }),
      origin
    );
  }

  const model_url = String(body?.model_url || "");
  const garment_url = String(body?.garment_url || "");
  if (!model_url || !garment_url) {
    return withCors(
      NextResponse.json({ error: "missing_params" }, { status: 400 }),
      origin
    );
  }

  const modelUrl = normalizeUrl(model_url);
  const garmentUrl = normalizeUrl(garment_url);
  const modelHash = sha1(modelUrl);
  const garmentHash = sha1(garmentUrl);
  const keyHash = makeKeyHash(user.uid, modelUrl, garmentUrl);

  // 1) Cache fast path by unique keyHash
  const cached = await prisma.tryOnResult.findUnique({
    where: { keyHash },
  });

  if (cached?.status === "completed" && cached.resultUrl) {
    return withCors(
      NextResponse.json(
        {
          id: cached.apiJobId || "",
          status: "completed",
          result_url: cached.resultUrl,
          key_hash: keyHash,
        },
        { status: 200 }
      ),
      origin
    );
  }

  if (cached?.status === "failed") {
    return withCors(
      NextResponse.json(
        {
          id: cached.apiJobId || "",
          status: "failed",
          error: cached.error || "failed",
          key_hash: keyHash,
        },
        { status: 200 }
      ),
      origin
    );
  }

  if (cached?.status === "pending" && cached.apiJobId) {
    // Job already running
    return withCors(
      NextResponse.json(
        { id: cached.apiJobId, status: "processing", key_hash: keyHash },
        { status: 202 }
      ),
      origin
    );
  }

  // 2) Start a new Fashn job
  const runRes = await fetch(`${FASHN_API}/run`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.FASHN_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model_name: "tryon-v1.6",
      inputs: {
        model_image: modelUrl,
        garment_image: garmentUrl,
      },
      category: "auto",
      moderation_level: "none",
      mode: "balanced",
    }),
  });

  if (!runRes.ok) {
    const err = await safeJson(runRes);
    return withCors(
      NextResponse.json(
        { error: "server_error", details: err || null },
        { status: 500 }
      ),
      origin
    );
  }

  const runData: any = await runRes.json();
  const jobId = runData?.id as string | undefined;
  if (!jobId) {
    return withCors(
      NextResponse.json({ error: "no_job_id" }, { status: 500 }),
      origin
    );
  }

  // 3) Persist/Upsert the pending job keyed by keyHash
  await prisma.tryOnResult.upsert({
    where: { keyHash },
    create: {
      userId: user.uid,
      modelUrl,
      garmentUrl,
      modelHash,
      garmentHash,
      keyHash,
      apiJobId: jobId,
      status: "pending",
    },
    update: {
      apiJobId: jobId,
      status: "pending",
      error: null,
    },
  });

  return withCors(
    NextResponse.json(
      { id: jobId, status: "processing", key_hash: keyHash },
      { status: 202 }
    ),
    origin
  );
}

export function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin");
  const requested = req.headers.get("access-control-request-headers");
  return preflight(origin, requested); // your cors.ts helper
}


// --- helpers ---
async function safeJson(r: Response) {
  try {
    return await r.json();
  } catch {
    return null;
  }
}
