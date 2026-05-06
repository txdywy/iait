import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';

const fixturePath = path.resolve(import.meta.dirname, 'fixtures/sec-edgar-companyfacts.json');
const fixture = JSON.parse(await fs.readFile(fixturePath, 'utf-8'));

describe('SecEdgarCapexScraper', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.resetModules();
  });

  it('fetches CapEx for 5 companies and produces company-level records', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(fixture),
    } as Response);

    const { default: scraper } = await import('../scrapers/sec-edgar-capex.js');
    const records = await scraper.fetch();

    expect(records.length).toBe(5);
    expect(records[0]).toMatchObject({
      source: 'sec-edgar-capex',
      entity: { type: 'company' },
      metric: 'ai-capex-ttm',
      unit: 'USD',
      confidence: 5,
    });
  });

  it('uses annual 10-K value directly when latest filing is annual', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(fixture),
    } as Response);

    const { default: scraper } = await import('../scrapers/sec-edgar-capex.js');
    const records = await scraper.fetch();

    const nvidia = records.find(r => r.entity.id === 'nvidia');
    expect(nvidia).toBeDefined();
    expect(nvidia!.value).toBe(1069000000);
  });

  it('computes TTM from latest Q3 cumulative filing plus prior annual remainder', async () => {
    const latestQuarterly = JSON.parse(JSON.stringify(fixture));
    latestQuarterly.units.USD = [
      {
        end: '2025-04-27',
        val: 200000000,
        accn: '0001045810-26-000001',
        fy: 2026,
        fp: 'Q1',
        form: '10-Q',
        filed: '2025-05-29',
      },
      {
        end: '2025-07-27',
        val: 450000000,
        accn: '0001045810-26-000002',
        fy: 2026,
        fp: 'Q2',
        form: '10-Q',
        filed: '2025-08-28',
      },
      {
        end: '2025-10-26',
        val: 750000000,
        accn: '0001045810-26-000003',
        fy: 2026,
        fp: 'Q3',
        form: '10-Q',
        filed: '2025-11-27',
      },
      {
        end: '2024-10-27',
        val: 369000000,
        accn: '0001045810-25-000003',
        fy: 2025,
        fp: 'Q3',
        form: '10-Q',
        filed: '2024-11-27',
      },
      {
        end: '2025-01-26',
        val: 1069000000,
        accn: '0001045810-25-000004',
        fy: 2025,
        fp: 'FY',
        form: '10-K',
        filed: '2025-02-26',
      },
    ];

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(latestQuarterly),
    } as Response);

    const { default: scraper } = await import('../scrapers/sec-edgar-capex.js');
    const records = await scraper.fetch();

    expect(records.length).toBe(5);
    expect(records.find(r => r.entity.id === 'nvidia')!.value).toBe(1450000000);
    expect(records.find(r => r.entity.id === 'nvidia')!.timestamp).toBe('2025-10-26T00:00:00Z');
  });

  it('sets User-Agent header with SEC_EDGAR_EMAIL', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(fixture),
    } as Response);

    const { default: scraper } = await import('../scrapers/sec-edgar-capex.js');
    await scraper.fetch();

    for (const call of vi.mocked(fetch).mock.calls) {
      const init = call[1] as RequestInit;
      const headers = init.headers as Record<string, string>;
      expect(headers['User-Agent']).toMatch(/ComputeAtlas/);
    }
  });

  it('handles empty USD array gracefully', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ...fixture, units: {} }),
    } as Response);

    const { default: scraper } = await import('../scrapers/sec-edgar-capex.js');
    const records = await scraper.fetch();

    expect(records).toEqual([]);
  });

  it('handles API failure for one company without crashing others', async () => {
    let callCount = 0;
    vi.mocked(fetch).mockImplementation((() => {
      callCount++;
      if (callCount === 2) {
        return Promise.resolve({ ok: false, status: 404, statusText: 'Not Found' } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(fixture),
      } as Response);
    }) as typeof fetch);

    const { default: scraper } = await import('../scrapers/sec-edgar-capex.js');
    const records = await scraper.fetch();

    expect(records.length).toBe(4);
  });
});
