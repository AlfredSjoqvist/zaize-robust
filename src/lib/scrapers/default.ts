import type { ScraperFn } from "./types";

export const scrapeGeneric: ScraperFn = async ({ page }) => {
  // Generic fallback: get <title>, first <h1>, all meta og:title/og:price if available
  const payload = await page.evaluate(() => {
    const grab = (sel: string) => document.querySelector(sel)?.textContent?.trim() ?? null;
    const meta = (n: string) => document.querySelector(`meta[property='${n}']`)?.getAttribute("content") ?? null;
    return {
      titleTag: document.title || null,
      h1: grab("h1"),
      ogTitle: meta("og:title"),
      ogPrice: meta("product:price:amount"),
      ogCurrency: meta("product:price:currency"),
      ogImage: meta("og:image"),
    };
  });
  return { payload, selectorUsed: "generic" };
};
