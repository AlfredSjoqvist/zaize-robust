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

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const Body = z.object({
  url: z.string().url(),
  debug: z.boolean().optional(),
});

function listDirSafe(p: string) {
  try {
    return fs.readdirSync(p);
  } catch (e: any) {
    return { error: e?.message || String(e) };
  }
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

  // ---- DEBUG SNAPSHOT (safe: no package.json imports)
  const guessedChromiumNodeModules = path.join(
    process.cwd(),
    "node_modules",
    "@sparticuz",
    "chromium",
    "bin"
  );
  const errorPathFromLogs =
    "/vercel/path0/node_modules/.pnpm/@sparticuz+chromium@141.0.0/node_modules/@sparticuz/chromium/bin";

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
          errorPathFromLogs,
          errorPathExists: fs.existsSync(errorPathFromLogs),
          errorPathList: listDirSafe(errorPathFromLogs),
        },
      }
    : undefined;

  let browser: Browser | null = null;
  try {
// On Vercel, help chromium find its bin/** by passing the package root
const packageRoot = process.env.VERCEL
  ? "/var/task/node_modules/@sparticuz/chromium"
  : undefined;

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
    await page.setUserAgent("Mozilla/5.0 (compatible; ZaizeScraper/1.0; +https://zaize.ai)");

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
      { ok: false, error: err?.message || "scrape-failed", ...(debug ? { __debug: debugInfo } : {}) },
      { status: 500 }
    );
  } finally {
    if (browser) { try { await browser.close(); } catch {} }
  }
}
