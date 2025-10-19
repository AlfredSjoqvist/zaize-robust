import type { ScraperFn } from "./types";
import { scrapeHM } from "./hm";
import { scrapeGeneric } from "./default";

export function getScraper(host: string): ScraperFn {
  const h = host.toLowerCase();
  if (h === "www.hm.com" || h.endsWith(".hm.com")) return scrapeHM;

  // Add more hosts here:
  // if (h.endsWith("zalando.com")) return scrapeZalando;
  // if (h === "www.shein.com") return scrapeShein;

  return scrapeGeneric;
}
