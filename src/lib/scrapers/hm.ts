import type { ScraperFn } from "./types";

export const scrapeHM: ScraperFn = async ({ page, url }) => {
  // Basic cookie accept patterns (best-effort, non-fatal)
  for (const sel of [
    "#onetrust-accept-btn-handler",
    "button[aria-label='Accept all']",
    "button:has-text('Accept')",
    "text/Accept all/i",
  ]) {
    try { await page.waitForSelector(sel, { timeout: 2000 }); await page.click(sel); break; } catch {}
  }

  // Wait for main product container (adjust as necessary)
  const nameSel = "[data-testid='product-name'], h1";
  await page.waitForSelector(nameSel, { timeout: 15_000 });

  const payload = await page.evaluate(() => {
    const grab = (sel: string) => document.querySelector(sel)?.textContent?.trim() ?? null;
    const grabAttr = (sel: string, attr: string) => document.querySelector(sel)?.getAttribute(attr) ?? null;

    const title =
      document.querySelector("[data-testid='product-name']")?.textContent?.trim() ||
      document.querySelector("h1")?.textContent?.trim() ||
      null;

    const price =
      document.querySelector("[data-testid='product-price']")?.textContent?.trim() ||
      document.querySelector("[itemprop='price']")?.getAttribute("content") ||
      null;

    // Sizes
    const sizes = Array.from(
      document.querySelectorAll("[data-testid='size-selector'] [role='option'], .product-sizes button, .size-selector button")
    ).map((el) => ({
      label: (el.textContent || "").trim(),
      disabled: el.hasAttribute("disabled") || el.getAttribute("aria-disabled") === "true",
    }));

    // Hero image
    const img =
      grabAttr("img[loading][srcset]", "src") ||
      grabAttr("img[loading='lazy']", "src") ||
      grabAttr("img", "src");

    return { title, price, sizes, img, brand: "H&M" };
  });

  return { payload, selectorUsed: nameSel };
};
