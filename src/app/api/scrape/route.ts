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

function listDirSafe(p: string) {
  try {
    return fs.readdirSync(p);
  } catch (e: any) {
    return { error: e?.message || String(e) };
  }
}

// In Vercel lambdas, Next often places node_modules under paths like:
//   /var/task/.next/server/chunks/**/node_modules/@sparticuz/chromium
// rather than /var/task/node_modules.
// We scan a few likely roots up to a small depth to find a folder whose name
// ends with "@sparticuz/chromium" AND contains a "bin" subdir.
function findChromiumRoot(): { root?: string; checked: string[] } {
  const checked: string[] = [];

  // Try require.resolve() first (may be inlined/bundled and not resolvable)
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const resolved = require.resolve("@sparticuz/chromium");
    const root = path.dirname(resolved);
    checked.push(resolved, root, path.join(root, "bin"));
    if (fs.existsSync(path.join(root, "bin"))) {
      return { root, checked };
    }
  } catch {
    checked.push("require.resolve(@sparticuz/chromium) failed");
  }

  const roots = [
    "/var/task/.next/server",
    "/var/task",
  ];

  const maxDepth = 4;
  const queue: { dir: string; depth: number }[] = [];

  for (const r of roots) {
    if (fs.existsSync(r)) queue.push({ dir: r, depth: 0 });
  }

  while (queue.length) {
    const { dir, depth } = queue.shift()!;
    checked.push(dir);

    if (dir.endsWith(path.join("@sparticuz", "chromium"))) {
      const bin = path.join(dir, "bin");
      checked.push(bin);
      if (fs.existsSync(bin)) {
        return { root: dir, checked };
      }
    }

    if (depth >= maxDepth) continue;

    let entries: string[] = [];
    try {
      entries = fs.readdirSync(dir).map((n) => path.join(dir, n));
    } catch {
      continue;
    }

    for (const p of entries) {
      try {
        const stat = fs.statSync(p);
        if (stat.isDirectory()) queue.push({ dir: p, depth: depth + 1 });
      } catch {
        // ignore
      }
    }
  }

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

  const normalizedUrl = `${target.origin}${target.pathname}${target.search}`;
  const urlHash = createHash("sha256").update(normalizedUrl).digest("hex");

  const { root: detectedRoot, checked } = process.env.VERCEL ? findChromiumRoot() : { root: undefined, checked: [] };

  const debugInfo = debug
    ? {
        node: process.version,
        platform: process.platform,
        arch: process.arch,
        env: { NODE_ENV: process.env.NODE_ENV, VERCEL: process.env.VERCEL },
        chromium: {
          detectedRoot,
          detectedBinExists: detectedRoot ? fs.existsSync(path.join(detectedRoot, "bin")) : false,
          checked,
        },
      }
    : undefined;

  let browser: Browser | null = null;
  try {
    const executablePath =
      process.env.NODE_ENV === "development"
        ? undefined
        : await chromium.executablePath(process.env.VERCEL ? detectedRoot : undefined);

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
      create: { id: urlHash, url: target.toString(), host: target.hostname, selectorUsed: selectorUsed ?? null, payload: safePayload },
      update: { url: target.toString(), host: target.hostname, selectorUsed: selectorUsed ?? null, payload: safePayload },
    });

    return NextResponse.json({ ok: true, key: urlHash, host: rec.host, payload: rec.payload, ...(debug ? { __debug: debugInfo } : {}) });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "scrape-failed", ...(debug ? { __debug: debugInfo } : {}) }, { status: 500 });
  } finally {
    if (browser) { try { await browser.close(); } catch {} }
  }
}
