import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import type { NormalizedRecord, PipelineMeta } from '../types.js';
import { EntityType } from '../types.js';

vi.mock('../registry.js', () => ({
  discoverScrapers: vi.fn(),
  getScrapers: vi.fn().mockReturnValue([]),
}));

vi.mock('../compiler.js', () => ({
  compile: vi.fn().mockResolvedValue(undefined),
}));

const { groupByEntity, writeEntityIfChanged } = await import('../run-pipeline.js');
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
