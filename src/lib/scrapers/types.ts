import type { Page } from "puppeteer-core";

export type ScrapeResult = Record<string, unknown>;

export type ScraperFn = (args: {
  page: Page;
  url: URL;
}) => Promise<{ payload: ScrapeResult; selectorUsed?: string }>;
