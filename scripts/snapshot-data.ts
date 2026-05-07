import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

interface SnapshotOptions {
  dataDir?: string;
  snapshotId?: string;
  keep?: number;
}

interface SnapshotManifestEntry {
  snapshotId: string;
  createdAt: string;
  sourceDataDir: string;
  files: string[];
}

const SNAPSHOT_FILES = [
  'latest.json',
  'rankings.json',
  'history.json',
  '_pipeline-meta.json',
  'index-config.json',
  'entity-crossref.json',
] as const;

function defaultSnapshotId(date = new Date()): string {
  return date.toISOString().replace(/[:.]/g, '-');
}

function sanitizeSnapshotId(snapshotId: string): string {
  return snapshotId.replace(/[^A-Za-z0-9_-]/g, '-');
}

async function readManifest(manifestPath: string): Promise<SnapshotManifestEntry[]> {
  try {
    const raw = await fs.readFile(manifestPath, 'utf-8');
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter(isManifestEntry) : [];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw err;
  }
}

function isManifestEntry(value: unknown): value is SnapshotManifestEntry {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.snapshotId === 'string'
    && typeof candidate.createdAt === 'string'
    && typeof candidate.sourceDataDir === 'string'
    && Array.isArray(candidate.files)
    && candidate.files.every(file => typeof file === 'string');
}

async function removeSnapshotDir(snapshotsDir: string, snapshotId: string): Promise<void> {
  const snapshotDir = path.join(snapshotsDir, sanitizeSnapshotId(snapshotId));
  const relative = path.relative(snapshotsDir, snapshotDir);
  if (relative === '' || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Refusing to delete snapshot outside snapshots directory: ${snapshotId}`);
  }
  await fs.rm(snapshotDir, { recursive: true, force: true });
}

export async function createSnapshot(options: SnapshotOptions = {}): Promise<string> {
  const dataDir = options.dataDir ?? 'public/data';
  const keep = options.keep ?? 30;
  if (!Number.isInteger(keep) || keep <= 0) {
    throw new Error('Snapshot keep must be a positive integer');
  }
  const snapshotId = sanitizeSnapshotId(options.snapshotId ?? defaultSnapshotId());
  const snapshotsDir = path.join(dataDir, 'snapshots');
  const snapshotDir = path.join(snapshotsDir, snapshotId);
  const manifestPath = path.join(snapshotsDir, 'manifest.json');

  await fs.mkdir(snapshotDir, { recursive: true });

  try {
    for (const fileName of SNAPSHOT_FILES) {
      await fs.copyFile(path.join(dataDir, fileName), path.join(snapshotDir, fileName));
    }
  } catch (err) {
    await fs.rm(snapshotDir, { recursive: true, force: true });
    throw err;
  }

  const createdAt = new Date().toISOString();
  const existing = await readManifest(manifestPath);
  const entry: SnapshotManifestEntry = {
    snapshotId,
    createdAt,
    sourceDataDir: dataDir,
    files: [...SNAPSHOT_FILES],
  };
  const nextManifest = [entry, ...existing.filter(item => item.snapshotId !== snapshotId)];
  const retained = nextManifest.slice(0, keep);
  const pruned = nextManifest.slice(keep);

  for (const item of pruned) {
    await removeSnapshotDir(snapshotsDir, item.snapshotId);
  }

  await fs.writeFile(manifestPath, JSON.stringify(retained, null, 2));
  return snapshotId;
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  const [, , dataDir, snapshotId, keepArg] = process.argv;
  const keep = keepArg === undefined ? undefined : Number.parseInt(keepArg, 10);
  createSnapshot({ dataDir: dataDir ?? 'public/data', snapshotId, keep }).then((id) => {
    console.log(`[data:snapshot] Created snapshot ${id}`);
  }).catch((err) => {
    console.error(`[data:snapshot] ${(err as Error).message}`);
    process.exit(1);
  });
}
