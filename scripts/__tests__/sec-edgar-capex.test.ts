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

  it('falls back to latest annual filing when latest filing is quarterly', async () => {
    const latestQuarterly = JSON.parse(JSON.stringify(fixture));
    latestQuarterly.units.USD.unshift({
      end: '2024-04-28',
      val: 500000000,
      accn: '0001045810-24-000111',
      fy: 2025,
      fp: 'Q1',
      form: '10-Q',
      filed: '2024-05-29',
    });

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(latestQuarterly),
    } as Response);

    const { default: scraper } = await import('../scrapers/sec-edgar-capex.js');
    const records = await scraper.fetch();

    expect(records.length).toBe(5);
    expect(records.find(r => r.entity.id === 'nvidia')!.value).toBe(1069000000);
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
