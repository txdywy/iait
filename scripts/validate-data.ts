import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

interface ValidationResult {
  ok: boolean;
  errors: string[];
}

const REQUIRED_FILES = [
  'latest.json',
  'rankings.json',
  'history.json',
  '_pipeline-meta.json',
  'index-config.json',
  'entity-crossref.json',
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isConfidence(value: unknown): value is number {
  return Number.isInteger(value) && typeof value === 'number' && value >= 1 && value <= 5;
}

function isIsoDate(value: unknown): value is string {
  return isNonEmptyString(value)
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)
    && Number.isFinite(Date.parse(value));
}

const VALID_ENTITY_TYPES = new Set(['country', 'city', 'cloud-region', 'company']);

async function readJson(dataDir: string, fileName: string, errors: string[]): Promise<unknown> {
  const filePath = path.join(dataDir, fileName);
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      const missingMessage = fileName === 'latest.json'
        ? 'Missing required data file: latest.json'
        : `Missing required data file: ${fileName}`;
      errors.push(missingMessage);
      return undefined;
    }
    errors.push(`Invalid JSON in ${fileName}: ${(err as Error).message}`);
    return undefined;
  }
}

function validateLatest(value: unknown, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push('latest.json must be an object');
    return;
  }
  if (!isIsoDate(value.generated)) {
    errors.push('latest.json generated must be an ISO timestamp');
  }
  if (!isRecord(value.entities) || Object.keys(value.entities).length < 1) {
    errors.push('latest.json entities must be a non-empty object');
    return;
  }
  for (const [entityId, entity] of Object.entries(value.entities)) {
    if (!isRecord(entity)) {
      errors.push(`latest.json entity ${entityId} must be an object`);
      continue;
    }
    if (!isNonEmptyString(entity.type) || !VALID_ENTITY_TYPES.has(entity.type)) {
      errors.push(`latest.json entity ${entityId} type must be a valid entity type`);
    }
    if (!isFiniteNumber(entity.score)) errors.push(`latest.json entity ${entityId} score must be finite`);
    if (!isConfidence(entity.confidence)) errors.push(`latest.json entity ${entityId} confidence must be 1-5`);
    if (!isNonEmptyString(entity.name)) errors.push(`latest.json entity ${entityId} name must be non-empty`);
    if (!isIsoDate(entity.lastUpdated)) {
      errors.push(`latest.json entity ${entityId} lastUpdated must be an ISO timestamp`);
    }
  }
}

function validateRankings(value: unknown, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push('rankings.json must be an object');
    return;
  }
  const byType = value.byType;
  if (!isRecord(byType)) {
    errors.push('rankings.json byType must be an object');
    return;
  }
  void 'byType.countries';
  for (const key of ['countries', 'cities', 'cloudRegions']) {
    const rows = byType[key];
    if (!Array.isArray(rows)) {
      errors.push(`rankings.json byType.${key} must be an array`);
      continue;
    }
    for (const [index, row] of rows.entries()) {
      if (!isRecord(row)) {
        errors.push(`rankings.json byType.${key}[${index}] must be an object`);
        continue;
      }
      if (!isFiniteNumber(row.rank)) errors.push(`rankings.json byType.${key}[${index}] rank must be finite`);
      if (!isNonEmptyString(row.entityId)) errors.push(`rankings.json byType.${key}[${index}] entityId must be non-empty`);
      if (!isFiniteNumber(row.score)) errors.push(`rankings.json byType.${key}[${index}] score must be finite`);
      if (!isConfidence(row.confidence)) errors.push(`rankings.json byType.${key}[${index}] confidence must be 1-5`);
    }
  }
}

function validateHistory(value: unknown, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push('history.json must be an object');
    return;
  }

  for (const [entityId, entity] of Object.entries(value)) {
    if (!isRecord(entity)) {
      errors.push(`history.json entity ${entityId} must be an object`);
      continue;
    }
    if (entity.type !== undefined && typeof entity.type !== 'string') {
      errors.push(`history.json entity ${entityId} type must be a string`);
    }
    if (entity.name !== undefined && typeof entity.name !== 'string') {
      errors.push(`history.json entity ${entityId} name must be a string`);
    }
    if (!Array.isArray(entity.series)) {
      errors.push(`history.json entity ${entityId} series must be an array`);
      continue;
    }

    for (const [index, point] of entity.series.entries()) {
      if (!isRecord(point)) {
        errors.push(`history.json entity ${entityId} series[${index}] must be an object`);
        continue;
      }
      if (!isIsoDate(point.timestamp)) {
        errors.push(`history.json entity ${entityId} series[${index}].timestamp must be an ISO timestamp`);
      }
      if (!isFiniteNumber(point.score)) {
        errors.push(`history.json entity ${entityId} series[${index}].score must be finite`);
      }
      if (point.confidence !== undefined && !isConfidence(point.confidence)) {
        errors.push(`history.json entity ${entityId} series[${index}].confidence must be 1-5`);
      }
      if (!isRecord(point.factors)) {
        errors.push(`history.json entity ${entityId} series[${index}].factors must be an object`);
      }
    }
  }
}

function validateMeta(value: unknown, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push('_pipeline-meta.json must be an object');
    return;
  }
  if (!isIsoDate(value.lastRun)) {
    errors.push('_pipeline-meta.json lastRun must be a parseable ISO timestamp');
  }
  if (!isRecord(value.entities)) {
    errors.push('_pipeline-meta.json entities must be an object');
  }
}

function validateIndexConfig(value: unknown, errors: string[]): void {
  if (!isRecord(value) || !isRecord(value.factors)) {
    errors.push('index-config.json factors must be an object');
    return;
  }
  const weightSum = Object.entries(value.factors).reduce((sum, [factorName, factor]) => {
    if (!isRecord(factor) || !isFiniteNumber(factor.weight)) {
      errors.push(`index-config.json factor ${factorName} weight must be finite`);
      return sum;
    }
    return sum + factor.weight;
  }, 0);
  if (weightSum < 0.999 || weightSum > 1.001) {
    errors.push(`index-config.json factor weights must sum to 1.0 (got ${weightSum})`);
  }
}

function validateCrossRef(value: unknown, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push('entity-crossref.json must be an object');
    return;
  }
  for (const key of ['countries', 'cities', 'cloudRegions', 'companies']) {
    if (!isRecord(value[key])) {
      errors.push(`entity-crossref.json ${key} must be an object`);
    }
  }
}

export async function validateDataDir(dataDir = 'public/data'): Promise<ValidationResult> {
  const errors: string[] = [];
  const files = new Map<string, unknown>();

  for (const fileName of REQUIRED_FILES) {
    files.set(fileName, await readJson(dataDir, fileName, errors));
  }

  if (files.get('latest.json') !== undefined) validateLatest(files.get('latest.json'), errors);
  if (files.get('rankings.json') !== undefined) validateRankings(files.get('rankings.json'), errors);
  if (files.get('history.json') !== undefined) validateHistory(files.get('history.json'), errors);
  if (files.get('_pipeline-meta.json') !== undefined) validateMeta(files.get('_pipeline-meta.json'), errors);
  if (files.get('index-config.json') !== undefined) validateIndexConfig(files.get('index-config.json'), errors);
  if (files.get('entity-crossref.json') !== undefined) validateCrossRef(files.get('entity-crossref.json'), errors);

  return { ok: errors.length === 0, errors };
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  const dataDir = process.argv[2] ?? 'public/data';
  validateDataDir(dataDir).then((result) => {
    if (!result.ok) {
      for (const error of result.errors) console.error(`[data:validate] ${error}`);
      process.exit(1);
    }
    console.log(`[data:validate] OK: ${dataDir}`);
  }).catch((err) => {
    console.error(`[data:validate] ${(err as Error).message}`);
    process.exit(1);
  });
}
