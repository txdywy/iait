import type { EntityCrossRef, EntityFile, ExportControlTiers, IndexConfig } from './types.js';
import { EntityType } from './types.js';

const METRIC_TO_FACTOR: Record<string, string> = {
  'gpu-price-hr': 'gpu_supply',
  'primary-energy-consumption': 'energy_capacity',
  'electricity-generation': 'energy_capacity',
  'electricity-production': 'energy_capacity',
  'ai-capex-ttm': 'ai_capex',
};

const ENERGY_PRIORITY: Record<string, number> = {
  'electricity-generation': 3,
  'electricity-production': 2,
  'primary-energy-consumption': 1,
};

export function percentileRank(value: number, allValues: number[]): number {
  if (allValues.length <= 1) return 50;
  if (allValues.every(v => v === allValues[0])) return 50;
  const count = allValues.filter(v => v <= value).length;
  return (count / allValues.length) * 100;
}

export function computeFactors(
  entity: EntityFile,
  crossRef: EntityCrossRef,
): Record<string, number> {
  const factors: Record<string, number> = {};
  const latestByFactor = new Map<string, { timestamp: string; value: number; priority: number }>();
  const gpuPrices: number[] = [];

  for (const record of entity.series) {
    const factor = METRIC_TO_FACTOR[record.metric];
    if (!factor || !Number.isFinite(record.value)) continue;

    if (factor === 'gpu_supply') {
      if (record.value > 0) gpuPrices.push(record.value);
      continue;
    }

    const priority = factor === 'energy_capacity' ? ENERGY_PRIORITY[record.metric] ?? 0 : 0;
    const existing = latestByFactor.get(factor);
    if (
      !existing
      || record.timestamp > existing.timestamp
      || (record.timestamp === existing.timestamp && priority > existing.priority)
    ) {
      latestByFactor.set(factor, { timestamp: record.timestamp, value: record.value, priority });
    }
  }

  if (gpuPrices.length > 0) {
    factors.gpu_supply = 1 / Math.min(...gpuPrices);
  }

  for (const [factor, record] of latestByFactor) {
    factors[factor] = record.value;
  }

  if (entity.type === EntityType.COUNTRY) {
    const regionCount = Object.values(crossRef.cloudRegions)
      .filter(region => region.country === entity.id).length;
    factors.cloud_region_density = regionCount;
  }

  return factors;
}

export function normalizeFactors(
  entityFactors: Map<string, Record<string, number>>,
  entityTypes: Map<string, EntityType>,
  targetType: EntityType,
): Map<string, Record<string, number>> {
  const normalized = new Map<string, Record<string, number>>();
  const entries = Array.from(entityFactors.entries())
    .filter(([id]) => entityTypes.get(id) === targetType);

  const factorNames = new Set<string>();
  for (const [, factors] of entries) {
    for (const factor of Object.keys(factors)) {
      factorNames.add(factor);
    }
  }

  for (const factor of factorNames) {
    const values = entries
      .map(([id, factors]) => ({ id, value: factors[factor] }))
      .filter(entry => entry.value !== undefined);
    const allValues = values.map(entry => entry.value);

    for (const { id, value } of values) {
      const existing = normalized.get(id) ?? {};
      existing[factor] = percentileRank(value, allValues);
      normalized.set(id, existing);
    }
  }

  return normalized;
}

export function computeCompositeScore(
  normalized: Record<string, number>,
  weights: Record<string, number>,
  riskMultiplier: number,
): { score: number; presentWeight: number } {
  let weightedSum = 0;
  let presentWeight = 0;

  for (const [factor, weight] of Object.entries(weights)) {
    if (normalized[factor] !== undefined) {
      weightedSum += weight * normalized[factor];
      presentWeight += weight;
    }
  }

  return {
    score: presentWeight > 0 ? (weightedSum / presentWeight) * riskMultiplier : 0,
    presentWeight,
  };
}

export function computeConfidence(
  entity: EntityFile,
  factorNames: string[],
  config: IndexConfig,
): { confidence: number; dataCompleteness: 'full' | 'partial' } {
  const baseConfidence = entity.series.length > 0
    ? entity.series.reduce((sum, record) => sum + record.confidence, 0) / entity.series.length
    : 0;
  const expectedFactors = Object.keys(config.factors).length;
  const missingPenalty = Math.max(0, expectedFactors - factorNames.length)
    * config.confidence.missingFactorPenalty;

  const now = Date.now();
  let stalenessPenalty = 0;
  for (const record of entity.series) {
    const ageDays = (now - new Date(record.timestamp).getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays > config.confidence.veryStaleDays) {
      stalenessPenalty = Math.max(stalenessPenalty, config.confidence.veryStalePenalty);
    } else if (ageDays > config.confidence.staleDays) {
      stalenessPenalty = Math.max(stalenessPenalty, config.confidence.stalePenalty);
    }
  }

  return {
    confidence: Math.max(
      config.confidence.minConfidence,
      Math.round(baseConfidence - missingPenalty - stalenessPenalty),
    ),
    dataCompleteness: factorNames.length < 3 ? 'partial' : 'full',
  };
}

export function aggregateToCountries(
  entities: Map<string, EntityFile>,
  crossRef: EntityCrossRef,
): Map<string, Record<string, number>> {
  const aggregated = new Map<string, Record<string, number>>();
  const regionsByCountry = new Map<string, Record<string, number>[]>();

  for (const [id, entity] of entities) {
    if (entity.type !== EntityType.CLOUD_REGION) continue;
    const region = crossRef.cloudRegions[id];
    if (!region) continue;

    const factors = computeFactors(entity, crossRef);
    const countryRegions = regionsByCountry.get(region.country) ?? [];
    countryRegions.push(factors);
    regionsByCountry.set(region.country, countryRegions);
  }

  for (const [countryId, regions] of regionsByCountry) {
    const gpuValues = regions
      .map(region => region.gpu_supply)
      .filter((value): value is number => value !== undefined);
    const factors: Record<string, number> = { cloud_region_density: regions.length };

    if (gpuValues.length > 0) {
      factors.gpu_supply = gpuValues.reduce((sum, value) => sum + value, 0) / gpuValues.length;
    }

    aggregated.set(countryId, factors);
  }

  return aggregated;
}

export function aggregateToCities(
  entities: Map<string, EntityFile>,
  crossRef: EntityCrossRef,
): Map<string, Record<string, number>> {
  const aggregated = new Map<string, Record<string, number>>();
  const regionsByCity = new Map<string, Record<string, number>[]>();

  for (const [id, entity] of entities) {
    if (entity.type !== EntityType.CLOUD_REGION) continue;
    const region = crossRef.cloudRegions[id];
    if (!region?.city) continue;

    const factors = computeFactors(entity, crossRef);
    const cityRegions = regionsByCity.get(region.city) ?? [];
    cityRegions.push(factors);
    regionsByCity.set(region.city, cityRegions);
  }

  for (const [cityId, regions] of regionsByCity) {
    const gpuValues = regions
      .map(region => region.gpu_supply)
      .filter((value): value is number => value !== undefined);
    const factors: Record<string, number> = { cloud_region_density: regions.length };

    if (gpuValues.length > 0) {
      factors.gpu_supply = gpuValues.reduce((sum, value) => sum + value, 0) / gpuValues.length;
    }

    aggregated.set(cityId, factors);
  }

  return aggregated;
}

export function riskForEntity(
  entity: EntityFile,
  crossRef: EntityCrossRef,
  riskTiers: ExportControlTiers,
): { riskTier: string; riskMultiplier: number } {
  const countryId = entity.type === EntityType.COUNTRY
    ? entity.id
    : entity.type === EntityType.CLOUD_REGION
      ? crossRef.cloudRegions[entity.id]?.country
      : entity.type === EntityType.COMPANY
        ? crossRef.companies[entity.id]?.country
        : crossRef.cities[entity.id]?.country;
  const riskTier = countryId ? riskTiers.countries[countryId] ?? 'unrestricted' : 'unrestricted';
  const riskMultiplier = riskTiers.tiers[riskTier]?.multiplier ?? 1;
  return { riskTier, riskMultiplier };
}
