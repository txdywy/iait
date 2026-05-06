import { glob } from 'glob';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Scraper } from './types.js';

/** Module-level registry of discovered scrapers */
const scrapers = new Map<string, Scraper>();

/**
 * Discover and register all scrapers from scripts/scrapers/*.ts.
 * Uses glob-based file discovery for zero-touch extension.
 * Uses fileURLToPath for ESM path resolution (not import.meta.dirname).
 */
export async function discoverScrapers(): Promise<void> {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const pattern = path.resolve(__dirname, 'scrapers/*.ts');
  const files = await glob(pattern);

  for (const file of files) {
    const mod = await import(file);
    const scraper: Scraper = mod.default;
    if (scraper?.name && typeof scraper.fetch === 'function') {
      scrapers.set(scraper.name, scraper);
      console.log(`[registry] Registered scraper: ${scraper.name}`);
    }
  }
}

/**
 * Get all registered scrapers.
 */
export function getScrapers(): Scraper[] {
  return Array.from(scrapers.values());
}

/**
 * Look up a scraper by name. Returns undefined if not found.
 */
export function getScraper(name: string): Scraper | undefined {
  return scrapers.get(name);
}
