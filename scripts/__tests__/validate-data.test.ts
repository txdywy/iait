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
    'aws-us-east-1': { type: 'cloud-region', name: 'US East', series: [] },
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

    await expect(validateDataDir(tmpDir)).resolves.toEqual({ ok: true, errors: [] });
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
      'latest.json entity broken lastUpdated must be non-empty',
    ]));
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
});
