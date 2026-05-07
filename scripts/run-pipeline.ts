import { discoverScrapers, getScrapers } from './registry.js';
import { hashRecords } from './hash.js';
import { compile } from './compiler.js';
import type { NormalizedRecord, PipelineMeta, EntityFile } from './types.js';
import { EntityType } from './types.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DATA_DIR = process.env.COMPUTEATLAS_DATA_DIR ?? 'public/data';
const META_PATH = path.join(DATA_DIR, '_pipeline-meta.json');

export async function loadMeta(metaPath = META_PATH): Promise<PipelineMeta> {
  try {
    const raw = await fs.readFile(metaPath, 'utf-8');
    return JSON.parse(raw) as PipelineMeta;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return { lastRun: '', entities: {} };
    }
    throw err;
  }
}

export function groupByEntity(records: NormalizedRecord[]): Map<string, NormalizedRecord[]> {
  const groups = new Map<string, NormalizedRecord[]>();
  for (const record of records) {
    const existing = groups.get(record.entity.id) ?? [];
    existing.push(record);
    groups.set(record.entity.id, existing);
  }
  return groups;
}

export function assertSafePathSegment(label: string, value: string): void {
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed === '.' || trimmed === '..' || !/^[A-Za-z0-9_-]+$/.test(trimmed)) {
    const prefix = label === 'entity id' ? 'Unsafe entity id' : `Unsafe ${label}`;
    throw new Error(`${prefix}: ${value}`);
  }
}

export function assertEntityType(entityType: EntityType): void {
  if (!Object.values(EntityType).includes(entityType)) {
    throw new Error(`Unsafe entity type: ${entityType}`);
  }
}

export async function writeEntityIfChanged(
  entityId: string,
  entityType: EntityType,
  records: NormalizedRecord[],
  meta: PipelineMeta,
  dataDir = DATA_DIR,
): Promise<boolean> {
  assertSafePathSegment('entity id', entityId);
  assertEntityType(entityType);

  const newHash = hashRecords(records);
  const existingHash = meta.entities[entityId]?.hash;

  if (newHash === existingHash) {
    console.log(`[skip] ${entityId} unchanged (hash match)`);
    return false;
  }

  const filePath = path.join(dataDir, 'entities', entityType, `${entityId}.json`);
  const entitiesRoot = path.resolve(dataDir, 'entities');
  const resolvedFile = path.resolve(filePath);
  const relative = path.relative(entitiesRoot, resolvedFile);
  if (relative === '' || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Unsafe entity path for ${entityId}`);
  }

  await fs.mkdir(path.dirname(filePath), { recursive: true });

  const sortedByTime = [...records].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const entityFile: EntityFile = {
    id: entityId,
    type: entityType,
    latest: sortedByTime[sortedByTime.length - 1],
    series: sortedByTime,
    _hash: newHash,
    _updatedAt: new Date().toISOString(),
  };

  await fs.writeFile(filePath, JSON.stringify(entityFile, null, 2));
  meta.entities[entityId] = { hash: newHash, updatedAt: new Date().toISOString() };
  return true;
}

export async function runPipeline(dataDir = DATA_DIR): Promise<void> {
  console.log('[pipeline] Starting...');
  const metaPath = path.join(dataDir, '_pipeline-meta.json');
  const meta = await loadMeta(metaPath);

  await discoverScrapers();
  const scrapers = getScrapers();
  const allRecords = new Map<string, NormalizedRecord[]>();
  let failedScrapers = 0;
  let successfulScrapers = 0;
  let freshRecords = 0;

  for (const scraper of scrapers) {
    console.log(`[pipeline] Running scraper: ${scraper.name}`);
    try {
      const records = await scraper.fetch();
      successfulScrapers++;
      freshRecords += records.length;

      for (const [entityId, entityRecords] of groupByEntity(records)) {
        const existing = allRecords.get(entityId) ?? [];
        existing.push(...entityRecords);
        allRecords.set(entityId, existing);
      }
    } catch (err) {
      failedScrapers++;
      console.error(`[pipeline] Scraper ${scraper.name} failed: ${err}`);
    }
  }

  if (successfulScrapers === 0 || freshRecords === 0) {
    throw new Error(`No fresh records produced. Successful scrapers: ${successfulScrapers}, failed scrapers: ${failedScrapers}`);
  }

  let written = 0;
  let skipped = 0;

  for (const [entityId, records] of allRecords) {
    if (records.length === 0) continue;
    const entityType = records[0].entity.type;
    if (records.some(record => record.entity.type !== entityType)) {
      throw new Error(`Conflicting entity types for ${entityId}`);
    }
    const changed = await writeEntityIfChanged(entityId, entityType, records, meta, dataDir);
    if (changed) written++;
    else skipped++;
  }

  if (written === 0) {
    throw new Error(`No fresh records produced. Written: ${written}, skipped: ${skipped}`);
  }

  await compile(dataDir);

  meta.lastRun = new Date().toISOString();
  await fs.writeFile(metaPath, JSON.stringify(meta, null, 2));

  console.log(`[pipeline] Done. Records: ${freshRecords}, Written: ${written}, Skipped: ${skipped}`);
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  runPipeline().catch((err) => {
    console.error('[pipeline] Fatal error:', err);
    process.exit(1);
  });
}
