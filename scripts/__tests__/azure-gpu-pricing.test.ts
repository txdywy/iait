import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';

// Load fixture
const fixturePath = path.resolve(import.meta.dirname, 'fixtures/azure-api-response.json');
const fixture = JSON.parse(await fs.readFile(fixturePath, 'utf-8'));

describe('AzureGpuPricingScraper', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.resetModules();
  });

  it('normalizes Azure GPU pricing to NormalizedRecord format', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(fixture),
    } as Response);

    const { default: scraper } = await import('../scrapers/azure-gpu-pricing.js');
    const records = await scraper.fetch();

    expect(records.length).toBeGreaterThan(0);
    expect(records[0]).toMatchObject({
      source: 'azure-gpu-pricing',
      entity: { type: 'cloud-region' },
      metric: 'gpu-price-hr',
      unit: 'USD/hr',
      confidence: 5,
    });
  });

  it('filters non-primary meter regions', async () => {
    // Fixture has 5 items but one has isPrimaryMeterRegion: false
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(fixture),
    } as Response);

    const { default: scraper } = await import('../scrapers/azure-gpu-pricing.js');
    const records = await scraper.fetch();

    // 5 items in fixture × 3 GPU family queries = 15, minus 3 non-primary = 12
    // Each GPU family query returns the full fixture (5 items, 1 non-primary)
    // So per family: 4 primary records × 3 families = 12
    expect(records.length).toBe(12);
  });

  it('generates azure-{region} entity IDs', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(fixture),
    } as Response);

    const { default: scraper } = await import('../scrapers/azure-gpu-pricing.js');
    const records = await scraper.fetch();

    const entityIds = records.map(r => r.entity.id);
    expect(entityIds).toContain('azure-eastus');
    expect(entityIds).toContain('azure-westeurope');
    for (const id of entityIds) {
      expect(id).toMatch(/^azure-[a-z]+$/);
    }
  });

  it('extracts retailPrice as value', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(fixture),
    } as Response);

    const { default: scraper } = await import('../scrapers/azure-gpu-pricing.js');
    const records = await scraper.fetch();

    // First primary item in fixture has retailPrice 3.06
    const eastusRecords = records.filter(r => r.entity.id === 'azure-eastus');
    expect(eastusRecords.length).toBeGreaterThan(0);
    expect(eastusRecords[0].value).toBe(3.06);
  });

  it('follows NextPageLink for pagination', async () => {
    const page1 = { ...fixture, NextPageLink: 'https://prices.azure.com/api/retail/prices?page=2' };
    const page2 = { ...fixture, Items: [fixture.Items[0]], NextPageLink: null };

    let callCount = 0;
    vi.mocked(fetch).mockImplementation((() => {
      callCount++;
      // First call for each of 3 families returns page1 with NextPageLink
      // Second call for each family returns page2 (no more pages)
      if (callCount % 2 === 1) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(page1) } as Response);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(page2) } as Response);
    }) as typeof fetch);

    const { default: scraper } = await import('../scrapers/azure-gpu-pricing.js');
    const records = await scraper.fetch();

    // 3 families × 2 pages each = 6 fetch calls
    expect(callCount).toBe(6);
    expect(records.length).toBeGreaterThan(0);
  });

  it('skips items with non-finite prices', async () => {
    const badFixture = {
      ...fixture,
      Items: [
        { ...fixture.Items[0], retailPrice: Infinity },
        { ...fixture.Items[1], retailPrice: NaN },
        fixture.Items[2], // valid: 0.45
      ],
      Count: 3,
    };

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(badFixture),
    } as Response);

    const { default: scraper } = await import('../scrapers/azure-gpu-pricing.js');
    const records = await scraper.fetch();

    // Only the valid item (0.45) × 3 families = 3
    expect(records.length).toBe(3);
    for (const r of records) {
      expect(Number.isFinite(r.value)).toBe(true);
    }
  });

  it('skips items with missing or invalid effectiveStartDate', async () => {
    const badFixture = {
      ...fixture,
      Items: [
        { ...fixture.Items[0], effectiveStartDate: '' },
        { ...fixture.Items[1], effectiveStartDate: 'not-a-date' },
        fixture.Items[2],
      ],
      Count: 3,
    };

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(badFixture),
    } as Response);

    const { default: scraper } = await import('../scrapers/azure-gpu-pricing.js');
    const records = await scraper.fetch();

    expect(records.length).toBe(3);
    expect(records[0].timestamp).toBe('2024-01-01T00:00:00.000Z');
  });
});
