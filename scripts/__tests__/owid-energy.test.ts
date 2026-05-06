import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';

const fixturePath = path.resolve(import.meta.dirname, 'fixtures/owid-energy-sample.csv');
const fixtureCsv = await fs.readFile(fixturePath, 'utf-8');

describe('OwidEnergyScraper', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.resetModules();
  });

  it('parses CSV and produces country-level records', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(fixtureCsv),
    } as Response);

    const { default: scraper } = await import('../scrapers/owid-energy.js');
    const records = await scraper.fetch();

    expect(records.length).toBeGreaterThan(0);
    expect(records[0]).toMatchObject({
      source: 'owid-energy',
      entity: { type: 'country' },
      confidence: 5,
    });
  });

  it('filters to MVP countries only', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(fixtureCsv),
    } as Response);

    const { default: scraper } = await import('../scrapers/owid-energy.js');
    const records = await scraper.fetch();

    const entityIds = new Set(records.map(r => r.entity.id));
    for (const id of entityIds) {
      expect(['us', 'cn', 'de', 'gb', 'jp', 'in', 'sg', 'nl', 'ie', 'ca']).toContain(id);
    }
  });

  it('extracts most recent year per country per metric', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(fixtureCsv),
    } as Response);

    const { default: scraper } = await import('../scrapers/owid-energy.js');
    const records = await scraper.fetch();

    const usRecords = records.filter(r => r.entity.id === 'us');
    for (const record of usRecords) {
      expect(record.timestamp).toBe('2022-01-01T00:00:00Z');
    }
  });

  it('extracts three metrics per country', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(fixtureCsv),
    } as Response);

    const { default: scraper } = await import('../scrapers/owid-energy.js');
    const records = await scraper.fetch();

    const metrics = new Set(records.filter(r => r.entity.id === 'us').map(r => r.metric));
    expect(metrics).toContain('primary-energy-consumption');
    expect(metrics).toContain('electricity-generation');
    expect(metrics).toContain('renewables-share-elec');
  });

  it('handles empty CSV gracefully', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('country,year\n'),
    } as Response);

    const { default: scraper } = await import('../scrapers/owid-energy.js');
    const records = await scraper.fetch();

    expect(records).toEqual([]);
  });
});
