import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { validateDataDir } from '../validate-data.js';

const validFiles = {
  'latest.json': {
    generated: '2026-05-07T12:00:00.000Z',
    entities: {
      'aws-us-east-1': {
        type: 'cloud-region',
        name: 'US East',
        score: 42,
        confidence: 5,
        lastUpdated: '2026-05-07T12:00:00.000Z',
      },
    },
  },
  'rankings.json': {
    generated: '2026-05-07T12:00:00.000Z',
    byType: {
      countries: [{ rank: 1, entityId: 'us', score: 90, confidence: 4 }],
      cities: [{ rank: 1, entityId: 'ashburn', score: 80, confidence: 4 }],
      cloudRegions: [{ rank: 1, entityId: 'aws-us-east-1', score: 70, confidence: 5 }],
    },
  },
  'history.json': {
    'aws-us-east-1': {
      type: 'cloud-region',
      name: 'US East',
      series: [{
        timestamp: '2026-05-07T12:00:00.000Z',
        score: 42,
        confidence: 5,
        factors: { gpu_supply: 42 },
      }],
    },
  },
  '_pipeline-meta.json': {
    lastRun: '2026-05-07T12:00:00.000Z',
    entities: {},
  },
  'index-config.json': {
    version: 1,
    factors: {
      gpu_supply: { weight: 0.3, description: 'GPU' },
      energy_capacity: { weight: 0.2, description: 'Energy' },
      cloud_region_density: { weight: 0.15, description: 'Cloud' },
      ai_capex: { weight: 0.25, description: 'CapEx' },
      risk_adjustment: { weight: 0.1, description: 'Risk' },
    },
  },
  'entity-crossref.json': {
    countries: {},
    cities: {},
    cloudRegions: {},
    companies: {},
  },
};

async function writeFixture(dataDir: string, overrides: Record<string, unknown | undefined> = {}) {
  await fs.mkdir(dataDir, { recursive: true });
  for (const [fileName, value] of Object.entries(validFiles)) {
    if (overrides[fileName] === undefined && Object.prototype.hasOwnProperty.call(overrides, fileName)) {
      continue;
    }
    const finalValue = Object.prototype.hasOwnProperty.call(overrides, fileName)
      ? overrides[fileName]
      : value;
    await fs.writeFile(path.join(dataDir, fileName), JSON.stringify(finalValue, null, 2));
  }
}

const validEntityFile = {
  id: 'aws-us-east-1',
  type: 'cloud-region',
  latest: {
    source: 'test',
    entity: { id: 'aws-us-east-1', type: 'cloud-region', name: 'US East' },
    metric: 'gpu-price-hr',
    value: 42,
    unit: 'USD/hr',
    timestamp: '2026-05-07T12:00:00.000Z',
    confidence: 5,
  },
  series: [{
    source: 'test',
    entity: { id: 'aws-us-east-1', type: 'cloud-region', name: 'US East' },
    metric: 'gpu-price-hr',
    value: 42,
    unit: 'USD/hr',
    timestamp: '2026-05-07T12:00:00.000Z',
    confidence: 5,
  }],
  _hash: 'hash',
  _updatedAt: '2026-05-07T12:00:00.000Z',
};

async function writeEntityFile(dataDir: string, entityType = 'cloud-region', entityId = 'aws-us-east-1', value: unknown = validEntityFile) {
  const dir = path.join(dataDir, 'entities', entityType);
  await fs.mkdir(dir, { recursive: true });
  const content = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  await fs.writeFile(path.join(dir, `${entityId}.json`), content);
}

describe('validateDataDir', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'validate-data-test-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('passes valid aggregate data fixtures', async () => {
    await writeFixture(tmpDir);
    await writeEntityFile(tmpDir);

    await expect(validateDataDir(tmpDir)).resolves.toEqual({ ok: true, errors: [] });
  });

  it('fails when latest entities exist but entities directory is missing', async () => {
    await writeFixture(tmpDir);

    const result = await validateDataDir(tmpDir);

    expect(result.ok).toBe(false);
    expect(result.errors).toContain('entities directory is required when latest.json contains entities');
  });

  it('fails when a latest entity is missing its referenced detail file', async () => {
    await writeFixture(tmpDir);
    await fs.mkdir(path.join(tmpDir, 'entities', 'cloud-region'), { recursive: true });

    const result = await validateDataDir(tmpDir);

    expect(result.ok).toBe(false);
    expect(result.errors).toContain('Missing referenced entity detail file: entities/cloud-region/aws-us-east-1.json');
  });

  it('fails when latest.json is missing', async () => {
    await writeFixture(tmpDir, { 'latest.json': undefined });

    const result = await validateDataDir(tmpDir);

    expect(result.ok).toBe(false);
    expect(result.errors).toContain('Missing required data file: latest.json');
  });

  it('fails malformed latest entities and non-numeric scores', async () => {
    await writeFixture(tmpDir, {
      'latest.json': {
        generated: '2026-05-07T12:00:00.000Z',
        entities: {
          broken: { name: '', score: Number.NaN, confidence: 6, lastUpdated: '' },
        },
      },
    });

    const result = await validateDataDir(tmpDir);

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      'latest.json entity broken score must be finite',
      'latest.json entity broken confidence must be 1-5',
      'latest.json entity broken name must be non-empty',
      'latest.json entity broken lastUpdated must be an ISO timestamp',
    ]));
  });

  it('fails malformed latest entity lastUpdated timestamps', async () => {
    await writeFixture(tmpDir, {
      'latest.json': {
        generated: '2026-05-07T12:00:00.000Z',
        entities: {
          broken: { name: 'Broken', score: 1, confidence: 3, lastUpdated: 'not-a-date' },
        },
      },
    });

    const result = await validateDataDir(tmpDir);

    expect(result.ok).toBe(false);
    expect(result.errors).toContain('latest.json entity broken lastUpdated must be an ISO timestamp');
  });

  it.each(['05/07/2026', 'May 7 2026', '2026-05-07', '2026-05-07T12:00:00'])(
    'fails non-canonical latest entity lastUpdated timestamp %j',
    async (lastUpdated) => {
      await writeFixture(tmpDir, {
        'latest.json': {
          generated: '2026-05-07T12:00:00.000Z',
          entities: {
            broken: { type: 'cloud-region', name: 'Broken', score: 1, confidence: 3, lastUpdated },
          },
        },
      });

      const result = await validateDataDir(tmpDir);

      expect(result.ok).toBe(false);
      expect(result.errors).toContain('latest.json entity broken lastUpdated must be an ISO timestamp');
    },
  );

  it.each([
    { type: undefined, label: 'missing' },
    { type: '', label: 'empty' },
    { type: 'region', label: 'unexpected' },
  ])('fails latest entity with $label type', async ({ type }) => {
    const broken: Record<string, unknown> = {
      name: 'Broken',
      score: 1,
      confidence: 3,
      lastUpdated: '2026-05-07T12:00:00.000Z',
    };
    if (type !== undefined) broken.type = type;

    await writeFixture(tmpDir, {
      'latest.json': {
        generated: '2026-05-07T12:00:00.000Z',
        entities: { broken },
      },
    });

    const result = await validateDataDir(tmpDir);

    expect(result.ok).toBe(false);
    expect(result.errors).toContain('latest.json entity broken type must be a valid entity type');
  });

  it.each([
    {
      name: 'entity object',
      history: { 'aws-us-east-1': null },
      error: 'history.json entity aws-us-east-1 must be an object',
    },
    {
      name: 'series array',
      history: { 'aws-us-east-1': { type: 'cloud-region', name: 'US East' } },
      error: 'history.json entity aws-us-east-1 series must be an array',
    },
    {
      name: 'series timestamp',
      history: { 'aws-us-east-1': { series: [{ timestamp: 'bad-date', score: 1, confidence: 5, factors: {} }] } },
      error: 'history.json entity aws-us-east-1 series[0].timestamp must be an ISO timestamp',
    },
    {
      name: 'series score',
      history: { 'aws-us-east-1': { series: [{ timestamp: '2026-05-07T12:00:00.000Z', score: 'NaN', confidence: 5, factors: {} }] } },
      error: 'history.json entity aws-us-east-1 series[0].score must be finite',
    },
    {
      name: 'series confidence',
      history: { 'aws-us-east-1': { series: [{ timestamp: '2026-05-07T12:00:00.000Z', score: 1, confidence: 9, factors: {} }] } },
      error: 'history.json entity aws-us-east-1 series[0].confidence must be 1-5',
    },
    {
      name: 'series factors',
      history: { 'aws-us-east-1': { series: [{ timestamp: '2026-05-07T12:00:00.000Z', score: 1, confidence: 5, factors: null }] } },
      error: 'history.json entity aws-us-east-1 series[0].factors must be an object',
    },
  ])('fails malformed history $name before promotion', async ({ history, error }) => {
    await writeFixture(tmpDir, { 'history.json': history });

    const result = await validateDataDir(tmpDir);

    expect(result.ok).toBe(false);
    expect(result.errors).toContain(error);
  });

  it('fails malformed ranking rows before promotion', async () => {
    await writeFixture(tmpDir, {
      'rankings.json': {
        byType: {
          countries: [{ rank: '1', entityId: '', score: 'bad', confidence: 9 }],
          cities: [],
          cloudRegions: [],
        },
      },
    });

    const result = await validateDataDir(tmpDir);

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      'rankings.json byType.countries[0] rank must be finite',
      'rankings.json byType.countries[0] entityId must be non-empty',
      'rankings.json byType.countries[0] score must be finite',
      'rankings.json byType.countries[0] confidence must be 1-5',
    ]));
  });

  it('fails stale or missing meta lastRun', async () => {
    await writeFixture(tmpDir, {
      '_pipeline-meta.json': { entities: {} },
    });

    const result = await validateDataDir(tmpDir);

    expect(result.ok).toBe(false);
    expect(result.errors).toContain('_pipeline-meta.json lastRun must be a parseable ISO timestamp');
  });

  it('fails invalid factor weight sums and missing cross-reference maps', async () => {
    await writeFixture(tmpDir, {
      'index-config.json': { factors: { gpu_supply: { weight: 0.5 } } },
      'entity-crossref.json': { countries: {}, cities: {} },
    });

    const result = await validateDataDir(tmpDir);

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      'index-config.json factor weights must sum to 1.0 (got 0.5)',
      'entity-crossref.json cloudRegions must be an object',
      'entity-crossref.json companies must be an object',
    ]));
  });

  it.each(['2026-02-31T12:00:00.000Z', '2026-05-07T25:00:00.000Z'])(
    'fails impossible ISO timestamp %j',
    async (lastUpdated) => {
      await writeFixture(tmpDir, {
        'latest.json': {
          generated: '2026-05-07T12:00:00.000Z',
          entities: {
            broken: { type: 'cloud-region', name: 'Broken', score: 1, confidence: 3, lastUpdated },
          },
        },
      });

      const result = await validateDataDir(tmpDir);

      expect(result.ok).toBe(false);
      expect(result.errors).toContain('latest.json entity broken lastUpdated must be an ISO timestamp');
    },
  );

  it('validates entity detail JSON files under entities directories', async () => {
    await writeFixture(tmpDir);
    await writeEntityFile(tmpDir);

    await expect(validateDataDir(tmpDir)).resolves.toEqual({ ok: true, errors: [] });
  });

  it.each([
    { name: 'invalid json', entityType: 'cloud-region', entityId: 'aws-us-east-1', file: '{', error: 'Invalid JSON in entities/cloud-region/aws-us-east-1.json: Expected property name or' },
    { name: 'id mismatch', entityType: 'cloud-region', entityId: 'aws-us-east-1', file: { ...validEntityFile, id: 'other' }, error: 'entities/cloud-region/aws-us-east-1.json id must match file name' },
    { name: 'type mismatch', entityType: 'cloud-region', entityId: 'aws-us-east-1', file: { ...validEntityFile, type: 'city' }, error: 'entities/cloud-region/aws-us-east-1.json type must match directory' },
    { name: 'invalid type directory', entityType: 'regions', entityId: 'aws-us-east-1', file: { ...validEntityFile, type: 'regions' }, error: 'entities/regions/aws-us-east-1.json type directory must be a valid entity type' },
    { name: 'missing latest', entityType: 'cloud-region', entityId: 'aws-us-east-1', file: { ...validEntityFile, latest: null }, error: 'entities/cloud-region/aws-us-east-1.json latest must be an object' },
    { name: 'empty series', entityType: 'cloud-region', entityId: 'aws-us-east-1', file: { ...validEntityFile, series: [] }, error: 'entities/cloud-region/aws-us-east-1.json series must be a non-empty array' },
    { name: 'bad series timestamp', entityType: 'cloud-region', entityId: 'aws-us-east-1', file: { ...validEntityFile, series: [{ ...validEntityFile.series[0], timestamp: '2026-02-31T12:00:00.000Z' }] }, error: 'entities/cloud-region/aws-us-east-1.json series[0].timestamp must be an ISO timestamp' },
    { name: 'bad value', entityType: 'cloud-region', entityId: 'aws-us-east-1', file: { ...validEntityFile, latest: { ...validEntityFile.latest, value: Number.NaN } }, error: 'entities/cloud-region/aws-us-east-1.json latest.value must be finite' },
    { name: 'bad confidence', entityType: 'cloud-region', entityId: 'aws-us-east-1', file: { ...validEntityFile, latest: { ...validEntityFile.latest, confidence: 6 } }, error: 'entities/cloud-region/aws-us-east-1.json latest.confidence must be 1-5' },
  ])('fails malformed entity detail data: $name', async ({ entityType, entityId, file, error }) => {
    await writeFixture(tmpDir);
    await writeEntityFile(tmpDir, entityType, entityId, file);

    const result = await validateDataDir(tmpDir);

    expect(result.ok).toBe(false);
    expect(result.errors.some(message => message.includes(error))).toBe(true);
  });
});
