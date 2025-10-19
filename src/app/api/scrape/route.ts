// src/app/api/scrape/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import chromium from "@sparticuz/chromium";
import puppeteer, { type Browser } from "puppeteer-core";
import { getScraper } from "@/lib/scrapers";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

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

  let browser: Browser | null = null;
  try {
    // Use Sparticuz Chromium on Vercel; omit path in dev to let Puppeteer find Chrome
    const executablePath =
      process.env.NODE_ENV === "development" ? undefined : await chromium.executablePath();

    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath,
      headless: true, // <-- don't use chromium.headless
      // defaultViewport: { width: 1280, height: 1024 }, // optional
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (compatible; ZaizeScraper/1.0; +https://zaize.ai)"
    );

    await page.goto(target.toString(), {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });

    try {
      await page.waitForNetworkIdle({ timeout: 8_000 });
    } catch {}

    const scraper = getScraper(target.hostname);
    const { payload, selectorUsed } = await scraper({ page, url: target });

    // Ensure payload conforms to Prisma.InputJsonValue (deep-serializable)
    const safePayload: Prisma.InputJsonValue = JSON.parse(JSON.stringify(payload));

    const rec = await prisma.scrape.create({
      data: {
        url: target.toString(),
        host: target.hostname,
        selectorUsed: selectorUsed ?? null,
        payload: safePayload,
      },
    });

    return NextResponse.json({ ok: true, id: rec.id, host: rec.host, payload: rec.payload });
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
