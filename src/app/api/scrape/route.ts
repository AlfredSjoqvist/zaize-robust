// src/app/api/scrape/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import chromium from "@sparticuz/chromium";
import puppeteer, { type Browser } from "puppeteer-core";
import { getScraper } from "@/lib/scrapers";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { createHash } from "crypto";
import fs from "node:fs";
import path from "node:path";
import "@sparticuz/chromium";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const Body = z.object({
  url: z.string().url(),
  debug: z.boolean().optional(),
});

// Safe readdir helper for debug
function listDirSafe(p: string) {
  try {
    return fs.readdirSync(p);
  } catch (e: any) {
    return { error: e?.message || String(e) };
  }
}

/**
 * Try to find where @sparticuz/chromium actually lives in the deployed bundle.
 * We try, in order:
 *  - require.resolve() of the package entry, then walk up to its directory
 *  - common lambda paths under /var/task
 *  - fall back to undefined (let chromium decide)
 */
function getChromiumPackageRoot(): { root?: string; checked: string[] } {
  const checked: string[] = [];

  // 1) Resolve the installed module entry (works both locally and in lambda)
  try {
    // This resolves to something like .../@sparticuz/chromium/dist/cjs/index.cjs
    // or .../dist/api.js — we just need its parent dir.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const resolved = require.resolve("@sparticuz/chromium");
    const root = path.dirname(resolved);
    checked.push(resolved, root, path.join(root, "bin"));
    if (fs.existsSync(path.join(root, "bin"))) return { root, checked };
  } catch (e) {
    checked.push("require.resolve(@sparticuz/chromium) failed");
  }

  // 2) Common lambda locations
  for (const candidate of [
    "/var/task/node_modules/@sparticuz/chromium",
    "/var/task/.next/server/chunks/ssr/node_modules/@sparticuz/chromium",
    "/var/task/.next/server/app/api/scrape/node_modules/@sparticuz/chromium",
  ]) {
    checked.push(candidate, path.join(candidate, "bin"));
    if (fs.existsSync(path.join(candidate, "bin"))) {
      return { root: candidate, checked };
    }
  }

  // 3) Give up — let chromium.executablePath() do its default
  return { root: undefined, checked };
}

export async function POST(req: NextRequest) {
  const urlDebug = req.nextUrl.searchParams.get("debug") === "1";
  const json = await req.json().catch(() => ({}));
  const parse = Body.safeParse(json);
  if (!parse.success) {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  const target = new URL(parse.data.url);
  const debug = urlDebug || parse.data.debug === true;

  // Hash key from normalized URL
  const normalizedUrl = `${target.origin}${target.pathname}${target.search}`;
  const urlHash = createHash("sha256").update(normalizedUrl).digest("hex");

  // --- debug snapshot
  const guessedChromiumNodeModules = path.join(
    process.cwd(),
    "node_modules",
    "@sparticuz",
    "chromium",
    "bin"
  );

  const { root: detectedPackageRoot, checked } = getChromiumPackageRoot();

  const debugInfo = debug
    ? {
        node: process.version,
        platform: process.platform,
        arch: process.arch,
        env: { NODE_ENV: process.env.NODE_ENV, VERCEL: process.env.VERCEL },
        paths: {
          guessedBinDir: guessedChromiumNodeModules,
          guessedBinDirExists: fs.existsSync(guessedChromiumNodeModules),
          guessedBinDirList: listDirSafe(guessedChromiumNodeModules),
          detectedPackageRoot,
          detectedBinExists:
            detectedPackageRoot ? fs.existsSync(path.join(detectedPackageRoot, "bin")) : false,
          detectionChecked: checked,
        },
      }
    : undefined;

  let browser: Browser | null = null;
  try {
    // Only pass a packageRoot on Vercel if we *actually detected* one
    const packageRoot =
      process.env.VERCEL && detectedPackageRoot ? detectedPackageRoot : undefined;

    const executablePath =
      process.env.NODE_ENV === "development"
        ? undefined
        : await chromium.executablePath(packageRoot);

    if (debug && debugInfo) {
      (debugInfo as any).executablePath = executablePath;
    }

    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath,
      headless: true,
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (compatible; ZaizeScraper/1.0; +https://zaize.ai)"
    );

    await page.goto(target.toString(), { waitUntil: "domcontentloaded", timeout: 45_000 });
    try { await page.waitForNetworkIdle({ timeout: 8_000 }); } catch {}

    const scraper = getScraper(target.hostname);
    const { payload, selectorUsed } = await scraper({ page, url: target });

    const safePayload: Prisma.InputJsonValue = JSON.parse(JSON.stringify(payload));

    const rec = await prisma.scrape.upsert({
      where: { id: urlHash },
      create: {
        id: urlHash,
        url: target.toString(),
        host: target.hostname,
        selectorUsed: selectorUsed ?? null,
        payload: safePayload,
      },
      update: {
        url: target.toString(),
        host: target.hostname,
        selectorUsed: selectorUsed ?? null,
        payload: safePayload,
      },
    });

    return NextResponse.json({
      ok: true,
      key: urlHash,
      host: rec.host,
      payload: rec.payload,
      ...(debug ? { __debug: debugInfo } : {}),
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "scrape-failed",
        ...(debug ? { __debug: debugInfo } : {}),
      },
      { status: 500 }
    );
  } finally {
    if (browser) { try { await browser.close(); } catch {} }
  }
}
