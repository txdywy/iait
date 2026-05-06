import { discoverScrapers, getScrapers } from './registry.js';
import { hashRecords } from './hash.js';
import { compile } from './compiler.js';
import type { NormalizedRecord, PipelineMeta, EntityFile } from './types.js';
import { EntityType } from './types.js';
import fs from 'node:fs/promises';
import path from 'node:path';

const DATA_DIR = 'public/data';
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

export async function writeEntityIfChanged(
  entityId: string,
  entityType: EntityType,
  records: NormalizedRecord[],
  meta: PipelineMeta,
  dataDir = DATA_DIR,
): Promise<boolean> {
  const newHash = hashRecords(records);
  const existingHash = meta.entities[entityId]?.hash;

  if (newHash === existingHash) {
    console.log(`[skip] ${entityId} unchanged (hash match)`);
    return false;
  }

  const filePath = path.join(dataDir, 'entities', entityType, `${entityId}.json`);
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

async function run(): Promise<void> {
  console.log('[pipeline] Starting...');
  const meta = await loadMeta();

  await discoverScrapers();
  const scrapers = getScrapers();
  const allRecords = new Map<string, NormalizedRecord[]>();
  let totalRecords = 0;

  for (const scraper of scrapers) {
    console.log(`[pipeline] Running scraper: ${scraper.name}`);
    try {
      const records = await scraper.fetch();
      totalRecords += records.length;

      for (const [entityId, entityRecords] of groupByEntity(records)) {
        const existing = allRecords.get(entityId) ?? [];
        existing.push(...entityRecords);
        allRecords.set(entityId, existing);
      }
    } catch (err) {
      console.error(`[pipeline] Scraper ${scraper.name} failed: ${err}`);
    }
  }

  let written = 0;
  let skipped = 0;

  for (const [entityId, records] of allRecords) {
    if (records.length === 0) continue;
    const entityType = records[0].entity.type;
    const changed = await writeEntityIfChanged(entityId, entityType, records, meta);
    if (changed) written++;
    else skipped++;
  }

  if (written === 0 && Object.keys(meta.entities).length === 0) {
    console.warn('[pipeline] No data produced and no existing entities. Skipping compile.');
    return;
  }

  await compile(DATA_DIR);

  meta.lastRun = new Date().toISOString();
  await fs.writeFile(META_PATH, JSON.stringify(meta, null, 2));

  console.log(`[pipeline] Done. Records: ${totalRecords}, Written: ${written}, Skipped: ${skipped}`);
}

run().catch((err) => {
  console.error('[pipeline] Fatal error:', err);
  process.exit(1);
});
