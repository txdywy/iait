import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';

const fixturePath = path.resolve(import.meta.dirname, 'fixtures/aws-api-response.json');
const fixture = JSON.parse(await fs.readFile(fixturePath, 'utf-8'));

describe('AwsGpuPricingScraper', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.resetModules();
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

  it('extracts on-demand hourly price from public offer terms', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(fixture),
    } as Response);

    const { default: scraper } = await import('../scrapers/aws-gpu-pricing.js');
    const records = await scraper.fetch();

    expect(records[0].value).toBe(98.32);
  });

  it('uses static AWS public offer files instead of signed query API root', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(fixture),
    } as Response);

    const { default: scraper } = await import('../scrapers/aws-gpu-pricing.js');
    await scraper.fetch();

    const urls = vi.mocked(fetch).mock.calls.map(call => String(call[0]));
    expect(urls.length).toBeGreaterThan(0);
    expect(urls.every(url => url.includes('/offers/v1.0/aws/AmazonEC2/current/'))).toBe(true);
    expect(urls.every(url => url.endsWith('/index.json'))).toBe(true);
  });

  it('generates configured AWS cloud-region entity IDs', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(fixture),
    } as Response);

    const { default: scraper } = await import('../scrapers/aws-gpu-pricing.js');
    const records = await scraper.fetch();

    expect(records[0].entity.id).toMatch(/^aws-[a-z0-9-]+$/);
    expect(records.map(record => record.entity.id)).toContain('aws-us-east-1');
  });
});
