//src/app/api/uploads/presign/route.ts

export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getUserId } from "@/lib/auth";
import { s3, BUCKET, CDN_BASE } from "@/lib/s3";
import crypto from "node:crypto";

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { ext = "jpg", kind = "full_body", contentType } = await req.json();
  const key = `users/${userId}/${crypto.randomUUID()}.${ext}`;

  const cmd = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType || (ext === "png" ? "image/png" : "image/jpeg"),
  });

  const url = await getSignedUrl(s3, cmd, { expiresIn: 60 });
  const publicUrl = CDN_BASE
    ? `${CDN_BASE}/${key}`
    : `${process.env.S3_ENDPOINT?.replace(/\/$/, "")}/${BUCKET}/${key}`;

  return NextResponse.json({ key, url, publicUrl, kind });
}
