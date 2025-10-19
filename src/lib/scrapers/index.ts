// src/lib/scrapers/index.ts
import type { Page } from "puppeteer-core";
import { scrapeHMSizeGuide } from "./hm_sizeguide";

export type ScrapeResult = Record<string, unknown>;
export type ScraperFn = (args: { page: Page; url: URL }) => Promise<{ payload: ScrapeResult; selectorUsed?: string }>;

export function getScraper(host: string): ScraperFn {
  const h = host.toLowerCase();

  if (h === "www.hm.com" || h.endsWith(".hm.com")) {
    return async ({ page, url }) => {
      const payload = await scrapeHMSizeGuide(page, url);
      return { payload, selectorUsed: "hm:sizeguide" };
    };
  }

  // Fallback (not used for this task but kept for completeness)
  return async ({ page }) => {
    const payload = await page.evaluate(() => {
      return { titleTag: document.title || null };
    });
    return { payload, selectorUsed: "generic" };
  };
}
