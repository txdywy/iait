import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import type { NormalizedRecord, PipelineMeta, Scraper } from '../types.js';
import { DataSourceLayer, EntityType } from '../types.js';

vi.mock('../registry.js', () => ({
  discoverScrapers: vi.fn(),
  getScrapers: vi.fn().mockReturnValue([]),
}));

vi.mock('../compiler.js', () => ({
  compile: vi.fn().mockResolvedValue(undefined),
}));

const { discoverScrapers, getScrapers } = await import('../registry.js');
const { compile } = await import('../compiler.js');
const { groupByEntity, loadMeta, runPipeline, writeEntityIfChanged } = await import('../run-pipeline.js');
const { hashRecords } = await import('../hash.js');

const makeRecord = (
  entityId: string,
  ts: string,
  value = 1.0,
  metric = 'gpu-price-hr',
): NormalizedRecord => ({
  source: 'test',
  entity: { id: entityId, type: EntityType.CLOUD_REGION, name: 'Test Region' },
  metric,
  value,
  unit: 'USD/hr',
  timestamp: ts,
  confidence: 5,
});

const makeScraper = (records: NormalizedRecord[]): Scraper => ({
  name: 'test-scraper',
  source: DataSourceLayer.STRUCTURED_API,
  fetch: vi.fn().mockResolvedValue(records),
});

describe('groupByEntity', () => {
  it('groups records with the same entityId into a single array', () => {
    const records = [
      makeRecord('aws-us-east-1', '2026-01-01T00:00:00Z'),
      makeRecord('aws-us-west-2', '2026-01-01T00:00:00Z'),
      makeRecord('aws-us-east-1', '2026-01-02T00:00:00Z'),
    ];
    const groups = groupByEntity(records);
    expect(groups.size).toBe(2);
    expect(groups.get('aws-us-east-1')).toHaveLength(2);
    expect(groups.get('aws-us-west-2')).toHaveLength(1);
  });

  it('returns empty map for empty input', () => {
    const groups = groupByEntity([]);
    expect(groups.size).toBe(0);
  });
});

describe('writeEntityIfChanged', () => {
  let tmpDir: string;
  let meta: PipelineMeta;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'orchestrator-test-'));
    meta = { lastRun: '', entities: {} };
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('skips write when hash matches existing metadata', async () => {
    const records = [makeRecord('aws-us-east-1', '2026-01-01T00:00:00Z')];
    const hash = hashRecords(records);
    meta.entities['aws-us-east-1'] = { hash, updatedAt: '2026-01-01T00:00:00Z' };

    const result = await writeEntityIfChanged(
      'aws-us-east-1',
      EntityType.CLOUD_REGION,
      records,
      meta,
      tmpDir,
    );
    expect(result).toBe(false);
  });

  it('writes entity file when hash mismatches', async () => {
    const records = [makeRecord('aws-us-east-1', '2026-01-01T00:00:00Z', 1.0)];
    meta.entities['aws-us-east-1'] = { hash: 'old-hash', updatedAt: '2026-01-01T00:00:00Z' };

    const result = await writeEntityIfChanged(
      'aws-us-east-1',
      EntityType.CLOUD_REGION,
      records,
      meta,
      tmpDir,
    );
    expect(result).toBe(true);
    expect(meta.entities['aws-us-east-1'].hash).not.toBe('old-hash');
  });

  it('writes entity file for new entity and sorts series by timestamp', async () => {
    const records = [
      makeRecord('aws-us-east-1', '2026-01-02T00:00:00Z', 2),
      makeRecord('aws-us-east-1', '2026-01-01T00:00:00Z', 1),
    ];

    const result = await writeEntityIfChanged(
      'aws-us-east-1',
      EntityType.CLOUD_REGION,
      records,
      meta,
      tmpDir,
    );
    const raw = await fs.readFile(
      path.join(tmpDir, 'entities', EntityType.CLOUD_REGION, 'aws-us-east-1.json'),
      'utf-8',
    );
    const saved = JSON.parse(raw);

    expect(result).toBe(true);
    expect(meta.entities['aws-us-east-1'].hash).toMatch(/^[a-f0-9]{64}$/);
    expect(saved.series.map((record: NormalizedRecord) => record.timestamp)).toEqual([
      '2026-01-01T00:00:00Z',
      '2026-01-02T00:00:00Z',
    ]);
    expect(saved.latest.timestamp).toBe('2026-01-02T00:00:00Z');
  });

  it.each(['../escape', 'nested/path', 'nested\\path', '', '   ', 'bad:id'])(
    'rejects unsafe entity id %j before writing files',
    async (entityId) => {
      const records = [makeRecord('aws-us-east-1', '2026-01-01T00:00:00Z')];

      await expect(writeEntityIfChanged(
        entityId,
        EntityType.CLOUD_REGION,
        records,
        meta,
        tmpDir,
      )).rejects.toThrow('Unsafe entity id');
    },
  );

  it('rejects unsafe entity type before writing files', async () => {
    const records = [makeRecord('aws-us-east-1', '2026-01-01T00:00:00Z')];

    await expect(writeEntityIfChanged(
      'aws-us-east-1',
      'not-a-type' as EntityType,
      records,
      meta,
      tmpDir,
    )).rejects.toThrow('Unsafe entity type');
  });
});

describe('runPipeline data directory behavior', () => {
  let tmpDir: string;

  beforeEach(async () => {
    vi.mocked(discoverScrapers).mockResolvedValue(undefined);
    vi.mocked(getScrapers).mockReturnValue([]);
    vi.mocked(compile).mockResolvedValue(undefined);
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'run-pipeline-test-'));
  });

  afterEach(async () => {
    vi.clearAllMocks();
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('uses an explicit temp data directory for metadata, entity writes, and compile', async () => {
    const records = [makeRecord('aws-us-east-1', '2026-01-01T00:00:00Z')];
    vi.mocked(getScrapers).mockReturnValue([makeScraper(records)]);

    await runPipeline(tmpDir);

    await expect(fs.readFile(path.join(tmpDir, '_pipeline-meta.json'), 'utf-8')).resolves.toContain(
      'aws-us-east-1',
    );
    await expect(
      fs.readFile(path.join(tmpDir, 'entities', EntityType.CLOUD_REGION, 'aws-us-east-1.json'), 'utf-8'),
    ).resolves.toContain('Test Region');
    expect(compile).toHaveBeenCalledWith(tmpDir);
  });

  it('loadMeta reads from the explicit metadata path inside a temp data directory', async () => {
    const metaPath = path.join(tmpDir, '_pipeline-meta.json');
    await fs.writeFile(metaPath, JSON.stringify({ lastRun: '2026-01-01T00:00:00Z', entities: {} }));

    await expect(loadMeta(metaPath)).resolves.toEqual({
      lastRun: '2026-01-01T00:00:00Z',
      entities: {},
    });
  });

  it('uses COMPUTEATLAS_DATA_DIR as the default when no data directory is provided', async () => {
    const previousDataDir = process.env.COMPUTEATLAS_DATA_DIR;
    process.env.COMPUTEATLAS_DATA_DIR = tmpDir;
    const records = [makeRecord('default-path-entity', '2026-01-01T00:00:00Z')];
    vi.mocked(getScrapers).mockReturnValue([makeScraper(records)]);

    try {
      await runPipeline();
    } finally {
      if (previousDataDir === undefined) {
        delete process.env.COMPUTEATLAS_DATA_DIR;
      } else {
        process.env.COMPUTEATLAS_DATA_DIR = previousDataDir;
      }
    }

    await expect(fs.readFile(path.join(tmpDir, '_pipeline-meta.json'), 'utf-8')).resolves.toContain(
      'default-path-entity',
    );
    expect(compile).toHaveBeenCalledWith(tmpDir);
  });

  it('fails closed without compiling or updating metadata when all scrapers fail', async () => {
    const originalLastRun = '2026-01-01T00:00:00.000Z';
    const metaPath = path.join(tmpDir, '_pipeline-meta.json');
    await fs.writeFile(metaPath, JSON.stringify({
      lastRun: originalLastRun,
      entities: { existing: { hash: 'abc', updatedAt: originalLastRun } },
    }, null, 2));
    vi.mocked(getScrapers).mockReturnValue([{ ...makeScraper([]), fetch: vi.fn().mockRejectedValue(new Error('boom')) }]);

    await expect(runPipeline(tmpDir)).rejects.toThrow('No fresh records produced');

    expect(compile).not.toHaveBeenCalled();
    const stored = JSON.parse(await fs.readFile(metaPath, 'utf-8'));
    expect(stored.lastRun).toBe(originalLastRun);
  });

  it('fails closed without compiling or updating metadata when all scrapers return zero records', async () => {
    const originalLastRun = '2026-01-01T00:00:00.000Z';
    const metaPath = path.join(tmpDir, '_pipeline-meta.json');
    await fs.writeFile(metaPath, JSON.stringify({
      lastRun: originalLastRun,
      entities: { existing: { hash: 'abc', updatedAt: originalLastRun } },
    }, null, 2));
    vi.mocked(getScrapers).mockReturnValue([makeScraper([])]);

    await expect(runPipeline(tmpDir)).rejects.toThrow('No fresh records produced');

    expect(compile).not.toHaveBeenCalled();
    const stored = JSON.parse(await fs.readFile(metaPath, 'utf-8'));
    expect(stored.lastRun).toBe(originalLastRun);
  });

  it('succeeds after partial scraper failure when another scraper writes changed records', async () => {
    const records = [makeRecord('aws-us-east-1', '2026-01-01T00:00:00Z')];
    vi.mocked(getScrapers).mockReturnValue([
      { ...makeScraper([]), name: 'failing-scraper', fetch: vi.fn().mockRejectedValue(new Error('boom')) },
      { ...makeScraper(records), name: 'successful-scraper' },
    ]);

    await runPipeline(tmpDir);

    await expect(fs.readFile(path.join(tmpDir, '_pipeline-meta.json'), 'utf-8')).resolves.toContain(
      'aws-us-east-1',
    );
    expect(compile).toHaveBeenCalledWith(tmpDir);
  });

  it('rejects conflicting entity types for the same entity id before compile', async () => {
    const country = makeRecord('us', '2026-01-01T00:00:00Z');
    country.entity.type = EntityType.COUNTRY;
    const city = makeRecord('us', '2026-01-02T00:00:00Z');
    city.entity.type = EntityType.CITY;
    vi.mocked(getScrapers).mockReturnValue([makeScraper([country, city])]);

    await expect(runPipeline(tmpDir)).rejects.toThrow('Conflicting entity types for us');

    expect(compile).not.toHaveBeenCalled();
  });
});

describe('multi-source entity merging', () => {
  it('merges records from separate scrapers into a unified entity group', () => {
    const firstSource = [makeRecord('us', '2026-01-01T00:00:00Z', 100, 'electricity-generation')];
    const secondSource = [makeRecord('us', '2026-01-02T00:00:00Z', 200, 'electricity-production')];
    const allRecords = new Map<string, NormalizedRecord[]>();

    for (const records of [firstSource, secondSource]) {
      for (const [entityId, entityRecords] of groupByEntity(records)) {
        const existing = allRecords.get(entityId) ?? [];
        existing.push(...entityRecords);
        allRecords.set(entityId, existing);
      }
    }

    expect(allRecords.get('us')).toHaveLength(2);
    expect(allRecords.get('us')!.map(record => record.metric)).toEqual([
      'electricity-generation',
      'electricity-production',
    ]);
  });

  it('documents that one scraper failure should not prevent other records from merging', () => {
    const successfulRecords = [makeRecord('us', '2026-01-01T00:00:00Z', 100)];
    const groups = groupByEntity(successfulRecords);

    expect(groups.get('us')).toHaveLength(1);
  });
});
