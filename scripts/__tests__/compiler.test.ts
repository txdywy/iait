import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { EntityType } from '../types.js';

const indexConfig = {
  version: 1,
  factors: {
    gpu_supply: { weight: 0.3, description: 'GPU supply' },
    energy_capacity: { weight: 0.2, description: 'Energy' },
    cloud_region_density: { weight: 0.15, description: 'Regions' },
    ai_capex: { weight: 0.25, description: 'CapEx' },
    risk_adjustment: { weight: 0.1, description: 'Risk' },
  },
  confidence: {
    staleDays: 30,
    stalePenalty: 1,
    veryStaleDays: 90,
    veryStalePenalty: 2,
    missingFactorPenalty: 1,
    minConfidence: 1,
  },
};

async function seedConfig(dataDir: string): Promise<void> {
  await fs.writeFile(path.join(dataDir, 'index-config.json'), JSON.stringify(indexConfig));
}

async function writeEntity(
  dataDir: string,
  id: string,
  type: EntityType,
  records: Array<{ metric: string; value: number; timestamp?: string; confidence?: number }>,
): Promise<void> {
  const dir = path.join(dataDir, 'entities', type);
  await fs.mkdir(dir, { recursive: true });
  const series = records.map(record => ({
    source: 'test',
    entity: { id, type, name: id },
    metric: record.metric,
    value: record.value,
    unit: 'unit',
    timestamp: record.timestamp ?? '2026-01-01T00:00:00Z',
    confidence: record.confidence ?? 5,
  }));
  await fs.writeFile(path.join(dir, `${id}.json`), JSON.stringify({
    id,
    type,
    latest: series[series.length - 1],
    series,
    _hash: 'abc123',
    _updatedAt: '2026-01-01T00:00:00Z',
  }));
}

describe('Data Compiler', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'compiler-test-'));
    await seedConfig(tmpDir);
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('compile produces latest.json with composite index fields', async () => {
    await writeEntity(tmpDir, 'aws-us-east-1', EntityType.CLOUD_REGION, [
      { metric: 'gpu-price-hr', value: 98.32 },
    ]);

    const { compile } = await import('../compiler.js');
    await compile(tmpDir);

    const latest = JSON.parse(await fs.readFile(path.join(tmpDir, 'latest.json'), 'utf-8'));
    const entity = latest.entities['aws-us-east-1'];

    expect(latest).toHaveProperty('generated');
    expect(entity).toHaveProperty('type', 'cloud-region');
    expect(entity).toHaveProperty('name', 'aws-us-east-1');
    expect(entity).toHaveProperty('score');
    expect(entity.score).not.toBe(98.32);
    expect(entity).toHaveProperty('factors');
    expect(entity).toHaveProperty('confidence');
    expect(entity).toHaveProperty('lastUpdated');
    expect(entity).toHaveProperty('riskTier');
    expect(entity).toHaveProperty('riskMultiplier');
    expect(entity).toHaveProperty('factorBreakdown');
    expect(entity).toHaveProperty('dataCompleteness');
  });

  it('compile produces rankings.json sorted by composite score', async () => {
    await writeEntity(tmpDir, 'aws-us-east-1', EntityType.CLOUD_REGION, [
      { metric: 'gpu-price-hr', value: 10 },
    ]);
    await writeEntity(tmpDir, 'azure-eastus', EntityType.CLOUD_REGION, [
      { metric: 'gpu-price-hr', value: 2 },
    ]);

    const { compile } = await import('../compiler.js');
    await compile(tmpDir);

    const rankings = JSON.parse(await fs.readFile(path.join(tmpDir, 'rankings.json'), 'utf-8'));

    expect(rankings).toHaveProperty('generated');
    expect(rankings.byType).toHaveProperty('cloudRegions');
    expect(rankings.byType.cloudRegions[0]).toMatchObject({
      rank: 1,
      entityId: 'azure-eastus',
    });
  });

  it('compile produces history.json with composite score snapshots', async () => {
    await writeEntity(tmpDir, 'aws-us-east-1', EntityType.CLOUD_REGION, [
      { metric: 'gpu-price-hr', value: 98.32 },
    ]);

    const { compile } = await import('../compiler.js');
    await compile(tmpDir);

    const history = JSON.parse(await fs.readFile(path.join(tmpDir, 'history.json'), 'utf-8'));

    expect(history).toHaveProperty('aws-us-east-1');
    expect(history['aws-us-east-1']).toHaveProperty('type', 'cloud-region');
    expect(history['aws-us-east-1']).toHaveProperty('name', 'aws-us-east-1');
    expect(history['aws-us-east-1'].series[0]).toHaveProperty('score');
    expect(history['aws-us-east-1'].series[0]).toHaveProperty('factors');
  });

  it('compile creates virtual city entities from cloud-region rollups', async () => {
    await writeEntity(tmpDir, 'aws-us-east-1', EntityType.CLOUD_REGION, [
      { metric: 'gpu-price-hr', value: 10 },
    ]);
    await writeEntity(tmpDir, 'azure-eastus', EntityType.CLOUD_REGION, [
      { metric: 'gpu-price-hr', value: 2 },
    ]);

    const { compile } = await import('../compiler.js');
    await compile(tmpDir);

    const latest = JSON.parse(await fs.readFile(path.join(tmpDir, 'latest.json'), 'utf-8'));

    expect(latest.entities.ashburn).toMatchObject({
      type: 'city',
      factors: { cloud_region_density: 2 },
    });
    expect(latest.entities.ashburn.factors.gpu_supply).toBeGreaterThan(0);
  });

  it('compile preserves existing city entity data when adding cloud-region rollups', async () => {
    await writeEntity(tmpDir, 'ashburn', EntityType.CITY, [
      { metric: 'electricity-generation', value: 300 },
    ]);
    await writeEntity(tmpDir, 'aws-us-east-1', EntityType.CLOUD_REGION, [
      { metric: 'gpu-price-hr', value: 10 },
    ]);
    await writeEntity(tmpDir, 'azure-eastus', EntityType.CLOUD_REGION, [
      { metric: 'gpu-price-hr', value: 2 },
    ]);

    const { compile } = await import('../compiler.js');
    await compile(tmpDir);

    const latest = JSON.parse(await fs.readFile(path.join(tmpDir, 'latest.json'), 'utf-8'));

    expect(latest.entities.ashburn.name).toBe('ashburn');
    expect(latest.entities.ashburn.factors).toMatchObject({
      energy_capacity: 300,
      cloud_region_density: 2,
    });
    expect(latest.entities.ashburn.factors.gpu_supply).toBeGreaterThan(0);
  });

  it('compile preserves existing history snapshots when appending new scores', async () => {
    await writeEntity(tmpDir, 'aws-us-east-1', EntityType.CLOUD_REGION, [
      { metric: 'gpu-price-hr', value: 98.32 },
    ]);
    await fs.writeFile(path.join(tmpDir, 'history.json'), JSON.stringify({
      'aws-us-east-1': {
        type: 'cloud-region',
        name: 'aws-us-east-1',
        series: [{ timestamp: '2025-01-01T00:00:00Z', score: 42, factors: { gpu_supply: 0.01 } }],
      },
    }));

    const { compile } = await import('../compiler.js');
    await compile(tmpDir);

    const history = JSON.parse(await fs.readFile(path.join(tmpDir, 'history.json'), 'utf-8'));

    expect(history['aws-us-east-1'].series).toHaveLength(2);
    expect(history['aws-us-east-1'].series[0]).toMatchObject({ score: 42 });
  });
});
