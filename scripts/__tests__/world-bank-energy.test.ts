import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';

const fixturePath = path.resolve(import.meta.dirname, 'fixtures/world-bank-response.json');
const fixture = JSON.parse(await fs.readFile(fixturePath, 'utf-8'));

describe('WorldBankEnergyScraper', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.resetModules();
  });

  it('parses JSON response and produces country-level records', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(fixture),
    } as Response);

    const { default: scraper } = await import('../scrapers/world-bank-energy.js');
    const records = await scraper.fetch();

    expect(records.length).toBeGreaterThan(0);
    expect(records[0]).toMatchObject({
      source: 'world-bank-energy',
      entity: { type: 'country' },
      confidence: 5,
    });
  });

  it('skips null values', async () => {
    const withNull = JSON.parse(JSON.stringify(fixture));
    withNull[1][0].value = null;

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(withNull),
    } as Response);

    const { default: scraper } = await import('../scrapers/world-bank-energy.js');
    const records = await scraper.fetch();

    expect(records.map(r => r.entity.id)).not.toContain('us');
  });

  it('maps ISO-3 codes to entity IDs', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(fixture),
    } as Response);

    const { default: scraper } = await import('../scrapers/world-bank-energy.js');
    const records = await scraper.fetch();

    const entityIds = records.map(r => r.entity.id);
    expect(entityIds).toContain('us');
    expect(entityIds).toContain('cn');
    expect(entityIds).toContain('de');
  });

  it('uses live-valid World Bank electricity indicators', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(fixture),
    } as Response);

    const { default: scraper } = await import('../scrapers/world-bank-energy.js');
    await scraper.fetch();

    const urls = vi.mocked(fetch).mock.calls.map(call => String(call[0]));
    expect(urls.some(url => url.includes('EG.USE.ELEC.KH.PC'))).toBe(true);
    expect(urls.some(url => url.includes('EG.ELC.RNWX.KH'))).toBe(true);
    expect(urls.some(url => url.includes('EG.ELC.PROD.KH'))).toBe(false);
  });

  it('continues when one indicator request fails', async () => {
    let callCount = 0;
    vi.mocked(fetch).mockImplementation((() => {
      callCount++;
      if (callCount === 2) {
        return Promise.resolve({ ok: false, status: 400, statusText: 'Bad Request' } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(fixture),
      } as Response);
    }) as typeof fetch);

    const { default: scraper } = await import('../scrapers/world-bank-energy.js');
    const records = await scraper.fetch();

    expect(records.length).toBeGreaterThan(0);
    expect(callCount).toBe(2);
  });

  it('handles malformed response gracefully', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ error: 'bad request' }),
    } as Response);

    const { default: scraper } = await import('../scrapers/world-bank-energy.js');
    const records = await scraper.fetch();

    expect(records).toEqual([]);
  });
});
