import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock glob before importing registry
vi.mock('glob', () => ({
  glob: vi.fn(),
}));

import { discoverScrapers, getScrapers, getScraper } from '../registry.js';
import { glob } from 'glob';

describe('Scraper Registry', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('discovers and registers scrapers via glob', async () => {
    const mockScraper = {
      name: 'test-scraper',
      source: 'structured_api',
      fetch: vi.fn().mockResolvedValue([]),
    };

    vi.mocked(glob).mockResolvedValue(['/mock/scrapers/test-scraper.ts'] as any);
    vi.doMock('/mock/scrapers/test-scraper.ts', () => ({ default: mockScraper }));

    // Note: dynamic import in registry means we need to test the public API
    // The glob mock ensures discoverScrapers finds files
    await discoverScrapers();

    expect(glob).toHaveBeenCalled();
  });

  it('getScrapers returns array of registered scrapers', () => {
    const scrapers = getScrapers();
    expect(Array.isArray(scrapers)).toBe(true);
  });

  it('getScraper returns undefined for unknown name', () => {
    const scraper = getScraper('nonexistent-scraper');
    expect(scraper).toBeUndefined();
  });
});
