import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';

// Load fixture
const fixturePath = path.resolve(import.meta.dirname, 'fixtures/aws-api-response.json');
const fixture = JSON.parse(await fs.readFile(fixturePath, 'utf-8'));

describe('AwsGpuPricingScraper', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('normalizes GPU pricing to NormalizedRecord format', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(fixture),
    } as Response);

    const { default: scraper } = await import('../scrapers/aws-gpu-pricing.js');
    const records = await scraper.fetch();

    expect(records.length).toBeGreaterThan(0);
    expect(records[0]).toMatchObject({
      source: 'aws-gpu-pricing',
      entity: { type: 'cloud-region' },
      metric: 'gpu-price-hr',
      unit: 'USD/hr',
      confidence: 5,
    });
  });

  it('extracts on-demand price from PriceList item', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(fixture),
    } as Response);

    const { default: scraper } = await import('../scrapers/aws-gpu-pricing.js');
    const records = await scraper.fetch();

    expect(records[0].value).toBe(98.32);
  });

  it('generates kebab-case entity IDs', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(fixture),
    } as Response);

    const { default: scraper } = await import('../scrapers/aws-gpu-pricing.js');
    const records = await scraper.fetch();

    expect(records[0].entity.id).toMatch(/^aws-[a-z0-9-]+$/);
  });
});
