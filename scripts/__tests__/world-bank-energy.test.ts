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
