import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createSnapshot } from '../snapshot-data.js';

const aggregateFiles = {
  'latest.json': { generated: '2026-05-07T12:00:00.000Z', entities: { us: { score: 1 } } },
  'rankings.json': { generated: '2026-05-07T12:00:00.000Z', byType: {} },
  'history.json': { us: { series: [] } },
  '_pipeline-meta.json': { lastRun: '2026-05-07T12:00:00.000Z', entities: {} },
  'index-config.json': { factors: {} },
  'entity-crossref.json': { countries: {}, cities: {}, cloudRegions: {}, companies: {} },
};

async function writeAggregateFiles(dataDir: string) {
  await fs.mkdir(path.join(dataDir, 'entities', 'cloud-region'), { recursive: true });
  for (const [fileName, value] of Object.entries(aggregateFiles)) {
    await fs.writeFile(path.join(dataDir, fileName), JSON.stringify(value, null, 2));
  }
  await fs.writeFile(path.join(dataDir, 'entities', 'cloud-region', 'root-safe.json'), '{}');
}

describe('createSnapshot', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'snapshot-data-test-'));
    await writeAggregateFiles(tmpDir);
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('copies aggregate files into a dated snapshot directory', async () => {
    const snapshotId = await createSnapshot({
      dataDir: tmpDir,
      snapshotId: '2026-05-07T12-00-00Z',
    });

    expect(snapshotId).toBe('2026-05-07T12-00-00Z');
    for (const fileName of Object.keys(aggregateFiles)) {
      await expect(
        fs.readFile(path.join(tmpDir, 'snapshots', snapshotId, fileName), 'utf-8'),
      ).resolves.toContain(fileName === 'latest.json' ? 'generated' : '{');
    }
  });

  it('writes a newest-first manifest with snapshot metadata', async () => {
    const snapshotId = await createSnapshot({ dataDir: tmpDir, snapshotId: 'snap-1' });
    const raw = await fs.readFile(path.join(tmpDir, 'snapshots', 'manifest.json'), 'utf-8');
    const manifest = JSON.parse(raw);

    expect(manifest).toHaveLength(1);
    expect(manifest[0]).toMatchObject({
      snapshotId,
      sourceDataDir: tmpDir,
      files: Object.keys(aggregateFiles),
    });
    expect(Date.parse(manifest[0].createdAt)).not.toBeNaN();
  });

  it('sanitizes invalid snapshot ID characters including ISO colons and periods', async () => {
    const snapshotId = await createSnapshot({
      dataDir: tmpDir,
      snapshotId: '2026-05-07T12:00:00.000Z',
    });

    expect(snapshotId).toBe('2026-05-07T12-00-00-000Z');
    await expect(fs.stat(path.join(tmpDir, 'snapshots', snapshotId))).resolves.toBeTruthy();
  });

  it.each([{ keep: 0 }, { keep: -1 }, { keep: Number.NaN }])(
    'rejects invalid retention $keep before creating snapshots',
    async ({ keep }) => {
      await expect(createSnapshot({
        dataDir: tmpDir,
        snapshotId: 'invalid-keep',
        keep,
      })).rejects.toThrow('Snapshot keep must be a positive integer');

      await expect(fs.stat(path.join(tmpDir, 'snapshots', 'invalid-keep'))).rejects.toMatchObject({
        code: 'ENOENT',
      });
    },
  );

  it('prunes only old snapshot directories listed in manifest and keeps root data files', async () => {
    await createSnapshot({ dataDir: tmpDir, snapshotId: 'snap-1', keep: 2 });
    await createSnapshot({ dataDir: tmpDir, snapshotId: 'snap-2', keep: 2 });
    await createSnapshot({ dataDir: tmpDir, snapshotId: 'snap-3', keep: 2 });

    await expect(fs.stat(path.join(tmpDir, 'snapshots', 'snap-1'))).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(fs.stat(path.join(tmpDir, 'snapshots', 'snap-2'))).resolves.toBeTruthy();
    await expect(fs.stat(path.join(tmpDir, 'snapshots', 'snap-3'))).resolves.toBeTruthy();
    await expect(fs.stat(path.join(tmpDir, 'latest.json'))).resolves.toBeTruthy();
    await expect(fs.stat(path.join(tmpDir, 'rankings.json'))).resolves.toBeTruthy();
    await expect(fs.stat(path.join(tmpDir, 'history.json'))).resolves.toBeTruthy();
    await expect(fs.stat(path.join(tmpDir, '_pipeline-meta.json'))).resolves.toBeTruthy();
    await expect(fs.stat(path.join(tmpDir, 'index-config.json'))).resolves.toBeTruthy();
    await expect(fs.stat(path.join(tmpDir, 'entity-crossref.json'))).resolves.toBeTruthy();
    await expect(fs.stat(path.join(tmpDir, 'entities', 'cloud-region', 'root-safe.json'))).resolves.toBeTruthy();
  });
});
