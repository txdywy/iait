import fs from 'node:fs/promises';
import path from 'node:path';
import { EntityType } from './types.js';
import type { EntityFile, CompiledEntity } from './types.js';

/** Map EntityType to rankings output key */
const TYPE_KEY_MAP: Record<EntityType, string> = {
  [EntityType.COUNTRY]: 'countries',
  [EntityType.CITY]: 'cities',
  [EntityType.CLOUD_REGION]: 'cloudRegions',
  [EntityType.COMPANY]: 'companies',
};

/**
 * Recursively find all .json files under a directory.
 */
async function findJsonFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await findJsonFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      files.push(fullPath);
    }
  }
  return files;
}

/**
 * Load all entity files from the entities subdirectory.
 * Reads recursively. Files without required fields are logged and skipped.
 */
async function loadAllEntities(dataDir: string): Promise<Map<string, EntityFile>> {
  const entitiesDir = path.join(dataDir, 'entities');
  const entities = new Map<string, EntityFile>();

  try {
    const files = await findJsonFiles(entitiesDir);
    for (const file of files) {
      try {
        const raw = await fs.readFile(file, 'utf-8');
        const entity = JSON.parse(raw) as EntityFile;
        if (entity.id && entity.type && entity.latest) {
          entities.set(entity.id, entity);
        } else {
          console.warn(`[compiler] Skipping malformed entity file: ${file}`);
        }
      } catch (err) {
        console.warn(`[compiler] Skipping unreadable entity file: ${file}`);
      }
    }
  } catch (err) {
    // entities directory may not exist on first run
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
  }

  return entities;
}

/**
 * Write latest.json with current snapshot of all entities.
 * Phase 1: score = raw value (placeholder per D-16).
 */
async function writeLatest(
  entities: Map<string, EntityFile>,
  dataDir: string,
): Promise<void> {
  const latest: Record<string, CompiledEntity> = {};
  for (const [id, entity] of entities) {
    latest[id] = {
      type: entity.type,
      name: entity.latest.entity.name,
      score: entity.latest.value,
      factors: { [entity.latest.metric]: entity.latest.value },
      confidence: entity.latest.confidence,
      lastUpdated: entity._updatedAt,
    };
  }

  const output = JSON.stringify(
    { generated: new Date().toISOString(), entities: latest },
    null,
    2,
  );
  await fs.writeFile(path.join(dataDir, 'latest.json'), output);
}

interface RankingEntry {
  rank: number;
  entityId: string;
  score: number;
  confidence: number;
}

/**
 * Write rankings.json with entities grouped by type, sorted by score descending.
 */
async function writeRankings(
  entities: Map<string, EntityFile>,
  dataDir: string,
): Promise<void> {
  // Group by type
  const groups = new Map<EntityType, Array<{ id: string; score: number; confidence: number }>>();
  for (const [id, entity] of entities) {
    const group = groups.get(entity.type) ?? [];
    group.push({ id, score: entity.latest.value, confidence: entity.latest.confidence });
    groups.set(entity.type, group);
  }

  // Build byType object
  const byType: Record<string, RankingEntry[]> = {};
  for (const [type, key] of Object.entries(TYPE_KEY_MAP)) {
    const group = groups.get(type as EntityType) ?? [];
    group.sort((a, b) => b.score - a.score);
    byType[key] = group.map((entry, i) => ({
      rank: i + 1,
      entityId: entry.id,
      score: entry.score,
      confidence: entry.confidence,
    }));
  }

  const output = JSON.stringify(
    { generated: new Date().toISOString(), byType },
    null,
    2,
  );
  await fs.writeFile(path.join(dataDir, 'rankings.json'), output);
}

/**
 * Write history.json with per-entity time-series data.
 */
async function writeHistory(
  entities: Map<string, EntityFile>,
  dataDir: string,
): Promise<void> {
  const history: Record<string, { type: EntityType; name: string; series: Array<{ timestamp: string; score: number; factors: Record<string, number> }> }> = {};

  for (const [id, entity] of entities) {
    history[id] = {
      type: entity.type,
      name: entity.latest.entity.name,
      series: entity.series.map(record => ({
        timestamp: record.timestamp,
        score: record.value,
        factors: { [record.metric]: record.value },
      })),
    };
  }

  const output = JSON.stringify(history, null, 2);
  await fs.writeFile(path.join(dataDir, 'history.json'), output);
}

// Compile all entity files into aggregate outputs.
// dataDir: base data directory (default: 'public/data')
export async function compile(dataDir = 'public/data'): Promise<void> {
  const entities = await loadAllEntities(dataDir);
  await writeLatest(entities, dataDir);
  await writeRankings(entities, dataDir);
  await writeHistory(entities, dataDir);
}
