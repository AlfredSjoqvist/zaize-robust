// src/lib/scrapers/hm_sizeguide.ts
import type { Page } from "puppeteer-core";

export type HMSizeGuidePayload = {
  vendor: "hm";
  url: string;
  perSelection: Array<{
    index: number;
    label?: string | null;
    ariaLabel?: string | null;
    title?: string | null;
    tableAllTexts: string[]; // flat list of all descendant texts in the table
    tableRows: string[][];   // row-wise texts (th/td/h4/span)
  }>;
};

// simple sleep since some Puppeteer versions/types omit page.waitForTimeout
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function scrapeHMSizeGuide(page: Page, url: URL): Promise<HMSizeGuidePayload> {
  // Best-effort cookie acceptance
  for (const sel of [
    "#onetrust-accept-btn-handler",
    "button[aria-label*='Accept' i]",
    "text/Accept all/i",
  ]) {
    try { await page.waitForSelector(sel, { timeout: 2000 }); await page.click(sel); break; } catch {}
  }

  // 1) Open the Size guide
  const sizeGuideButtonSel = "button.eb129e.e001fa.c6dc8a, button[aria-label*='Size guide' i]";
  await page.waitForSelector(sizeGuideButtonSel, { timeout: 15_000 });
  await page.click(sizeGuideButtonSel);

  // Wait for the size-range list
  const rangesListSel = "ul.e4c9e9";
  await page.waitForSelector(rangesListSel, { timeout: 15_000 });

  // Count size buttons
  const total = await page.$$eval(`${rangesListSel} li button`, (els) => els.length);

  const perSelection: HMSizeGuidePayload["perSelection"] = [];

  for (let i = 0; i < total; i++) {
    // Click the i-th size button (re-query each time to avoid stale handles)
    const clickedMeta = await page.$$eval(
      `${rangesListSel} li button`,
      (els, idx) => {
        const btn = els[idx] as HTMLButtonElement;
        btn.click();
        return {
          label: (btn.textContent || "").trim() || null,
          ariaLabel: btn.getAttribute("aria-label"),
          title: btn.getAttribute("title"),
        };
      },
      i
    );

    // Brief settle time for SPA updates
    await sleep(300);

    // Ensure the table exists
    const tableSel = "table.cb0bc3";
    await page.waitForSelector(tableSel, { timeout: 10_000 });

    // Extract all nested texts and also row-wise texts
    const { tableAllTexts, tableRows } = await page.evaluate((sel) => {
      const tbl = document.querySelector(sel);
      const flatten = (root: Element | null): string[] => {
        if (!root) return [];
        const nodes = Array.from(root.querySelectorAll<HTMLElement>("*"));
        const vals = nodes
          .map((el) => (el.textContent ?? "").trim())
          .filter(Boolean);
        const own = (root.textContent ?? "").trim();
        return own ? [own, ...vals] : vals;
      };

      const rows = Array.from(tbl?.querySelectorAll("tr") ?? []).map((tr) => {
        const cells = tr.querySelectorAll<HTMLElement>("th,td,h4,span");
        return Array.from(cells)
          .map((el) => (el.textContent ?? "").trim())
          .filter(Boolean);
      });

      return { tableAllTexts: flatten(tbl), tableRows: rows };
    }, tableSel);

    perSelection.push({
      index: i,
      label: clickedMeta?.label ?? null,
      ariaLabel: clickedMeta?.ariaLabel ?? null,
      title: clickedMeta?.title ?? null,
      tableAllTexts,
      tableRows,
    });
  }

  return { vendor: "hm", url: url.toString(), perSelection };
}
