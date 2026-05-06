import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

describe('Data Compiler', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'compiler-test-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('compile produces latest.json with correct schema', async () => {
    // Create a mock entity file
    const entityDir = path.join(tmpDir, 'entities', 'cloud-region');
    await fs.mkdir(entityDir, { recursive: true });
    await fs.writeFile(path.join(entityDir, 'aws-us-east-1.json'), JSON.stringify({
      id: 'aws-us-east-1',
      type: 'cloud-region',
      latest: {
        source: 'aws-gpu-pricing',
        entity: { id: 'aws-us-east-1', type: 'cloud-region', name: 'US East (N. Virginia)' },
        metric: 'gpu-price-hr',
        value: 98.32,
        unit: 'USD/hr',
        timestamp: '2026-01-01T00:00:00Z',
        confidence: 5,
      },
      series: [],
      _hash: 'abc123',
      _updatedAt: '2026-01-01T00:00:00Z',
    }));

    // Import compile (will fail until compiler.ts exists)
    const { compile } = await import('../compiler.js');
    await compile(tmpDir);

    const latestRaw = await fs.readFile(path.join(tmpDir, 'latest.json'), 'utf-8');
    const latest = JSON.parse(latestRaw);

    expect(latest).toHaveProperty('generated');
    expect(latest).toHaveProperty('entities');
    expect(latest.entities['aws-us-east-1']).toHaveProperty('type', 'cloud-region');
    expect(latest.entities['aws-us-east-1']).toHaveProperty('name', 'US East (N. Virginia)');
    expect(latest.entities['aws-us-east-1']).toHaveProperty('score');
    expect(latest.entities['aws-us-east-1']).toHaveProperty('factors');
    expect(latest.entities['aws-us-east-1']).toHaveProperty('confidence');
    expect(latest.entities['aws-us-east-1']).toHaveProperty('lastUpdated');
  });

  it('compile produces rankings.json with correct schema', async () => {
    const entityDir = path.join(tmpDir, 'entities', 'cloud-region');
    await fs.mkdir(entityDir, { recursive: true });
    await fs.writeFile(path.join(entityDir, 'aws-us-east-1.json'), JSON.stringify({
      id: 'aws-us-east-1',
      type: 'cloud-region',
      latest: {
        source: 'aws-gpu-pricing',
        entity: { id: 'aws-us-east-1', type: 'cloud-region', name: 'US East (N. Virginia)' },
        metric: 'gpu-price-hr',
        value: 98.32,
        unit: 'USD/hr',
        timestamp: '2026-01-01T00:00:00Z',
        confidence: 5,
      },
      series: [],
      _hash: 'abc123',
      _updatedAt: '2026-01-01T00:00:00Z',
    }));

    const { compile } = await import('../compiler.js');
    await compile(tmpDir);

    const rankingsRaw = await fs.readFile(path.join(tmpDir, 'rankings.json'), 'utf-8');
    const rankings = JSON.parse(rankingsRaw);

    expect(rankings).toHaveProperty('generated');
    expect(rankings).toHaveProperty('byType');
    expect(rankings.byType).toHaveProperty('cloudRegions');
    expect(Array.isArray(rankings.byType.cloudRegions)).toBe(true);
    if (rankings.byType.cloudRegions.length > 0) {
      expect(rankings.byType.cloudRegions[0]).toHaveProperty('rank');
      expect(rankings.byType.cloudRegions[0]).toHaveProperty('entityId');
      expect(rankings.byType.cloudRegions[0]).toHaveProperty('score');
    }
  });

  it('compile produces history.json with correct schema', async () => {
    const entityDir = path.join(tmpDir, 'entities', 'cloud-region');
    await fs.mkdir(entityDir, { recursive: true });
    await fs.writeFile(path.join(entityDir, 'aws-us-east-1.json'), JSON.stringify({
      id: 'aws-us-east-1',
      type: 'cloud-region',
      latest: {
        source: 'aws-gpu-pricing',
        entity: { id: 'aws-us-east-1', type: 'cloud-region', name: 'US East (N. Virginia)' },
        metric: 'gpu-price-hr',
        value: 98.32,
        unit: 'USD/hr',
        timestamp: '2026-01-01T00:00:00Z',
        confidence: 5,
      },
      series: [{
        source: 'aws-gpu-pricing',
        entity: { id: 'aws-us-east-1', type: 'cloud-region', name: 'US East (N. Virginia)' },
        metric: 'gpu-price-hr',
        value: 98.32,
        unit: 'USD/hr',
        timestamp: '2026-01-01T00:00:00Z',
        confidence: 5,
      }],
      _hash: 'abc123',
      _updatedAt: '2026-01-01T00:00:00Z',
    }));

    const { compile } = await import('../compiler.js');
    await compile(tmpDir);

    const historyRaw = await fs.readFile(path.join(tmpDir, 'history.json'), 'utf-8');
    const history = JSON.parse(historyRaw);

    expect(history).toHaveProperty('aws-us-east-1');
    expect(history['aws-us-east-1']).toHaveProperty('type', 'cloud-region');
    expect(history['aws-us-east-1']).toHaveProperty('name', 'US East (N. Virginia)');
    expect(history['aws-us-east-1']).toHaveProperty('series');
    expect(Array.isArray(history['aws-us-east-1'].series)).toBe(true);
  });
});
