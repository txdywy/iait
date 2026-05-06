import fs from 'node:fs/promises';
import path from 'node:path';
import {
  aggregateToCities,
  aggregateToCountries,
  computeCompositeScore,
  computeConfidence,
  computeFactors,
  normalizeFactors,
  riskForEntity,
} from './index-model.js';
import { EntityType } from './types.js';
import type {
  CompiledEntity,
  EntityCrossRef,
  EntityFile,
  ExportControlTiers,
  IndexConfig,
} from './types.js';

const TYPE_KEY_MAP: Record<EntityType, string> = {
  [EntityType.COUNTRY]: 'countries',
  [EntityType.CITY]: 'cities',
  [EntityType.CLOUD_REGION]: 'cloudRegions',
  [EntityType.COMPANY]: 'companies',
};

interface ScoredEntity {
  entity: EntityFile;
  score: number;
  factors: Record<string, number>;
  factorBreakdown: Record<string, { raw: number; normalized: number; weight: number }>;
  confidence: number;
  riskTier: string;
  riskMultiplier: number;
  dataCompleteness: 'full' | 'partial';
}

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

async function loadJsonFile<T>(filePath: string): Promise<T> {
  const raw = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(raw) as T;
}

async function loadAllEntities(dataDir: string): Promise<Map<string, EntityFile>> {
  const entitiesDir = path.join(dataDir, 'entities');
  const entities = new Map<string, EntityFile>();

  try {
    const files = await findJsonFiles(entitiesDir);
    for (const file of files) {
      try {
        const entity = await loadJsonFile<EntityFile>(file);
        if (entity.id && entity.type && entity.latest) {
          entities.set(entity.id, entity);
        } else {
          console.warn(`[compiler] Skipping malformed entity file: ${file}`);
        }
      } catch {
        console.warn(`[compiler] Skipping unreadable entity file: ${file}`);
      }
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
  }

  return entities;
}

function virtualEntity(
  id: string,
  type: EntityType,
  name: string,
  factors: Record<string, number>,
): EntityFile {
  const timestamp = new Date().toISOString();
  const firstFactor = Object.entries(factors)[0] ?? ['virtual', 0];
  const record = {
    source: 'aggregate',
    entity: { id, type, name },
    metric: firstFactor[0],
    value: firstFactor[1],
    unit: 'index-factor',
    timestamp,
    confidence: 4,
  };

  return {
    id,
    type,
    latest: record,
    series: [record],
    _hash: '',
    _updatedAt: timestamp,
  };
}

function buildFactorBreakdown(
  raw: Record<string, number>,
  normalized: Record<string, number>,
  config: IndexConfig,
): Record<string, { raw: number; normalized: number; weight: number }> {
  const breakdown: Record<string, { raw: number; normalized: number; weight: number }> = {};
  for (const [factor, normalizedValue] of Object.entries(normalized)) {
    breakdown[factor] = {
      raw: raw[factor] ?? normalizedValue,
      normalized: normalizedValue,
      weight: config.factors[factor]?.weight ?? 0,
    };
  }
  return breakdown;
}

function validateWeights(config: IndexConfig): void {
  const sum = Object.values(config.factors).reduce((total, factor) => total + factor.weight, 0);
  if (!Number.isFinite(sum) || Math.abs(sum - 1) > 0.001) {
    console.warn(`[compiler] index-config weights sum to ${sum}, expected 1.0`);
  }
}

function computeAllScores(
  entities: Map<string, EntityFile>,
  config: IndexConfig,
  crossRef: EntityCrossRef,
  riskTiers: ExportControlTiers,
): Map<string, ScoredEntity> {
  validateWeights(config);

  const allEntities = new Map(entities);
  const rawFactors = new Map<string, Record<string, number>>();
  const entityTypes = new Map<string, EntityType>();

  for (const [id, entity] of entities) {
    rawFactors.set(id, computeFactors(entity, crossRef));
    entityTypes.set(id, entity.type);
  }

  for (const [countryId, factors] of aggregateToCountries(entities, crossRef)) {
    const existing = rawFactors.get(countryId) ?? {};
    rawFactors.set(countryId, { ...factors, ...existing });
    if (!allEntities.has(countryId)) {
      allEntities.set(countryId, virtualEntity(
        countryId,
        EntityType.COUNTRY,
        crossRef.countries[countryId]?.name ?? countryId,
        factors,
      ));
      entityTypes.set(countryId, EntityType.COUNTRY);
    }
  }

  for (const [cityId, factors] of aggregateToCities(entities, crossRef)) {
    rawFactors.set(cityId, factors);
    allEntities.set(cityId, virtualEntity(
      cityId,
      EntityType.CITY,
      crossRef.cities[cityId]?.name ?? cityId,
      factors,
    ));
    entityTypes.set(cityId, EntityType.CITY);
  }

  const normalized = new Map<string, Record<string, number>>();
  for (const type of Object.values(EntityType)) {
    for (const [id, factors] of normalizeFactors(rawFactors, entityTypes, type)) {
      normalized.set(id, factors);
    }
  }

  const weights = Object.fromEntries(
    Object.entries(config.factors).map(([factor, details]) => [factor, details.weight]),
  );
  const scored = new Map<string, ScoredEntity>();

  for (const [id, entity] of allEntities) {
    const entityRawFactors = rawFactors.get(id) ?? {};
    const entityNormalized = normalized.get(id) ?? {};
    const { riskTier, riskMultiplier } = riskForEntity(entity, crossRef, riskTiers);
    const { score } = computeCompositeScore(entityNormalized, weights, riskMultiplier);
    const { confidence, dataCompleteness } = computeConfidence(
      entity,
      Object.keys(entityRawFactors),
      config,
    );

    scored.set(id, {
      entity,
      score,
      factors: entityRawFactors,
      factorBreakdown: buildFactorBreakdown(entityRawFactors, entityNormalized, config),
      confidence,
      riskTier,
      riskMultiplier,
      dataCompleteness,
    });
  }

  return scored;
}

async function writeLatest(
  scoredEntities: Map<string, ScoredEntity>,
  dataDir: string,
): Promise<void> {
  const latest: Record<string, CompiledEntity> = {};
  for (const [id, scored] of scoredEntities) {
    latest[id] = {
      type: scored.entity.type,
      name: scored.entity.latest.entity.name,
      score: scored.score,
      factors: scored.factors,
      confidence: scored.confidence,
      lastUpdated: scored.entity._updatedAt,
      riskTier: scored.riskTier,
      riskMultiplier: scored.riskMultiplier,
      factorBreakdown: scored.factorBreakdown,
      dataCompleteness: scored.dataCompleteness,
    };
  }

  await fs.writeFile(
    path.join(dataDir, 'latest.json'),
    JSON.stringify({ generated: new Date().toISOString(), entities: latest }, null, 2),
  );
}

interface RankingEntry {
  rank: number;
  entityId: string;
  score: number;
  confidence: number;
}

async function writeRankings(
  scoredEntities: Map<string, ScoredEntity>,
  dataDir: string,
): Promise<void> {
  const groups = new Map<EntityType, Array<{ id: string; score: number; confidence: number }>>();
  for (const [id, scored] of scoredEntities) {
    const group = groups.get(scored.entity.type) ?? [];
    group.push({ id, score: scored.score, confidence: scored.confidence });
    groups.set(scored.entity.type, group);
  }

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

  await fs.writeFile(
    path.join(dataDir, 'rankings.json'),
    JSON.stringify({ generated: new Date().toISOString(), byType }, null, 2),
  );
}

async function writeHistory(
  scoredEntities: Map<string, ScoredEntity>,
  dataDir: string,
): Promise<void> {
  const history: Record<string, {
    type: EntityType;
    name: string;
    series: Array<{ timestamp: string; score: number; factors: Record<string, number> }>;
  }> = {};

  for (const [id, scored] of scoredEntities) {
    history[id] = {
      type: scored.entity.type,
      name: scored.entity.latest.entity.name,
      series: [{
        timestamp: scored.entity._updatedAt,
        score: scored.score,
        factors: scored.factors,
      }],
    };
  }

  await fs.writeFile(path.join(dataDir, 'history.json'), JSON.stringify(history, null, 2));
}

export async function compile(dataDir = 'public/data'): Promise<void> {
  const entities = await loadAllEntities(dataDir);
  const config = await loadJsonFile<IndexConfig>(path.join(dataDir, 'index-config.json'));
  const crossRef = await loadJsonFile<EntityCrossRef>('scripts/mappings/entity-crossref.json');
  const riskTiers = await loadJsonFile<ExportControlTiers>('scripts/mappings/export-control-tiers.json');
  const scoredEntities = computeAllScores(entities, config, crossRef, riskTiers);

  await writeLatest(scoredEntities, dataDir);
  await writeRankings(scoredEntities, dataDir);
  await writeHistory(scoredEntities, dataDir);
}
