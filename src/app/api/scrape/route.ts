// src/app/api/scrape/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import chromium from "@sparticuz/chromium";
import puppeteer, { type Browser } from "puppeteer-core";
import { getScraper } from "@/lib/scrapers";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { createHash } from "crypto";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const Body = z.object({
  url: z.string().url(),
});

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parse = Body.safeParse(json);
  if (!parse.success) {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  const target = new URL(parse.data.url);

  // Hash key: normalized full URL (origin + path + search)
  const normalizedUrl = `${target.origin}${target.pathname}${target.search}`;
  const urlHash = createHash("sha256").update(normalizedUrl).digest("hex");

  let browser: Browser | null = null;
  try {
    const executablePath =
      process.env.NODE_ENV === "development" ? undefined : await chromium.executablePath();

    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath,
      headless: true, // keep simple; don't rely on chromium.headless typing
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (compatible; ZaizeScraper/1.0; +https://zaize.ai)"
    );

    await page.goto(target.toString(), {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });

    try { await page.waitForNetworkIdle({ timeout: 8_000 }); } catch {}

    const scraper = getScraper(target.hostname);
    const { payload, selectorUsed } = await scraper({ page, url: target });

    // Ensure Prisma JSON type compatibility
    const safePayload: Prisma.InputJsonValue = JSON.parse(JSON.stringify(payload));

    // Upsert with the hash as the key
    const rec = await prisma.scrape.upsert({
      where: { id: urlHash },
      create: {
        id: urlHash,                // <-- hashed key
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
      // echo payload so you can visually verify extraction
      payload: rec.payload,
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { ok: false, error: err?.message || "scrape-failed" },
      { status: 500 }
    );
  } finally {
    if (browser) {
      try { await browser.close(); } catch {}
    }
  }
}
