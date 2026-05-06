import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  aggregateToCities,
  aggregateToCountries,
  computeCompositeScore,
  computeConfidence,
  computeFactors,
  normalizeFactors,
  percentileRank,
  riskForEntity,
} from '../index-model.js';
import type { EntityCrossRef, EntityFile, ExportControlTiers, IndexConfig } from '../types.js';
import { EntityType } from '../types.js';

const config: IndexConfig = {
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

const crossRef: EntityCrossRef = {
  countries: {
    us: { iso2: 'US', iso3: 'USA', worldBankCode: 'USA', owidName: 'United States', name: 'United States' },
    cn: { iso2: 'CN', iso3: 'CHN', worldBankCode: 'CHN', owidName: 'China', name: 'China' },
  },
  cloudRegions: {
    'aws-us-east-1': { country: 'us', city: 'ashburn', provider: 'aws' },
    'azure-eastus': { country: 'us', city: 'ashburn', provider: 'azure' },
    'azure-chinaeast2': { country: 'cn', city: 'shanghai', provider: 'azure' },
  },
  cities: {
    ashburn: { country: 'us', name: 'Ashburn, VA' },
    shanghai: { country: 'cn', name: 'Shanghai' },
  },
  companies: {
    nvidia: { cik: '0001045810', country: 'us', name: 'NVIDIA' },
  },
};

const riskTiers: ExportControlTiers = {
  version: 1,
  tiers: {
    unrestricted: { multiplier: 1, description: 'No restrictions' },
    sanctioned: { multiplier: 0.3, description: 'Sanctioned' },
  },
  countries: { us: 'unrestricted', cn: 'sanctioned' },
};

function entity(
  id: string,
  type: EntityType,
  metric: string,
  value: number,
  timestamp = '2026-01-01T00:00:00Z',
): EntityFile {
  const record = {
    source: 'test',
    entity: { id, type, name: id },
    metric,
    value,
    unit: 'unit',
    timestamp,
    confidence: 5,
  };
  return {
    id,
    type,
    latest: record,
    series: [record],
    _hash: 'hash',
    _updatedAt: timestamp,
  };
}

describe('percentileRank', () => {
  it('ranks values by percent of values less than or equal', () => {
    expect(percentileRank(30, [10, 20, 30])).toBe(100);
    expect(percentileRank(10, [10, 20, 30])).toBeCloseTo(33.333, 2);
  });

  it('returns neutral score for empty or single-value comparisons', () => {
    expect(percentileRank(10, [])).toBe(50);
    expect(percentileRank(10, [10])).toBe(50);
  });

  it('returns neutral score when all values are identical', () => {
    expect(percentileRank(5, [5, 5, 5])).toBe(50);
  });
});

describe('computeFactors', () => {
  it('extracts inverse minimum GPU price from cloud-region GPU pricing records', () => {
    const region = entity('aws-us-east-1', EntityType.CLOUD_REGION, 'gpu-price-hr', 4);
    region.series.push({ ...region.latest, value: 2 });

    expect(computeFactors(region, crossRef)).toMatchObject({ gpu_supply: 0.5 });
  });

  it('uses energy metric priority for same-date country energy metrics', () => {
    const country = entity('us', EntityType.COUNTRY, 'primary-energy-consumption', 100);
    country.series.push({ ...country.latest, metric: 'renewables-share-elec', value: 21.3 });
    country.series.push({ ...country.latest, metric: 'electricity-generation', value: 4000 });

    expect(computeFactors(country, crossRef))
      .toMatchObject({ energy_capacity: 4000, cloud_region_density: 2 });
  });

  it('extracts company ai_capex values', () => {
    expect(computeFactors(entity('nvidia', EntityType.COMPANY, 'ai-capex-ttm', 1_000_000_000), crossRef))
      .toMatchObject({ ai_capex: 1_000_000_000 });
  });
});

describe('normalizeFactors', () => {
  it('normalizes factors within the same entity type only', () => {
    const factors = new Map([
      ['us', { energy_capacity: 100 }],
      ['cn', { energy_capacity: 200 }],
      ['aws-us-east-1', { energy_capacity: 999 }],
    ]);
    const types = new Map([
      ['us', EntityType.COUNTRY],
      ['cn', EntityType.COUNTRY],
      ['aws-us-east-1', EntityType.CLOUD_REGION],
    ]);

    const normalized = normalizeFactors(factors, types, EntityType.COUNTRY);

    expect(normalized.get('cn')!.energy_capacity).toBe(100);
    expect(normalized.get('us')!.energy_capacity).toBe(50);
    expect(normalized.has('aws-us-east-1')).toBe(false);
  });
});

describe('computeCompositeScore', () => {
  it('computes weighted score with risk multiplier', () => {
    const result = computeCompositeScore(
      { gpu_supply: 100, energy_capacity: 50 },
      { gpu_supply: 0.3, energy_capacity: 0.2 },
      0.7,
    );

    expect(result.score).toBeCloseTo(56);
    expect(result.presentWeight).toBe(0.5);
  });

  it('returns zero when no factors are available', () => {
    expect(computeCompositeScore({}, { gpu_supply: 0.3 }, 1).score).toBe(0);
  });
});

describe('computeConfidence', () => {
  beforeEach(() => vi.useFakeTimers().setSystemTime(new Date('2026-05-07T00:00:00Z')));
  afterEach(() => vi.useRealTimers());

  it('penalizes missing factors and stale records with a minimum floor', () => {
    const oldEntity = entity('us', EntityType.COUNTRY, 'electricity-generation', 100, '2026-01-01T00:00:00Z');

    const result = computeConfidence(oldEntity, ['energy_capacity'], config);

    expect(result.confidence).toBe(1);
    expect(result.dataCompleteness).toBe('partial');
  });

  it('marks entities with at least three factors as full', () => {
    const result = computeConfidence(
      entity('us', EntityType.COUNTRY, 'electricity-generation', 100, '2026-05-01T00:00:00Z'),
      ['gpu_supply', 'energy_capacity', 'cloud_region_density'],
      config,
    );

    expect(result.dataCompleteness).toBe('full');
  });
});

describe('aggregation helpers', () => {
  it('aggregates cloud-region GPU supply to countries', () => {
    const entities = new Map([
      ['aws-us-east-1', entity('aws-us-east-1', EntityType.CLOUD_REGION, 'gpu-price-hr', 4)],
      ['azure-eastus', entity('azure-eastus', EntityType.CLOUD_REGION, 'gpu-price-hr', 2)],
    ]);

    const countries = aggregateToCountries(entities, crossRef);

    expect(countries.get('us')!.gpu_supply).toBeCloseTo(0.375);
    expect(countries.get('us')!.cloud_region_density).toBe(2);
  });

  it('aggregates cloud-region GPU supply to cities', () => {
    const entities = new Map([
      ['aws-us-east-1', entity('aws-us-east-1', EntityType.CLOUD_REGION, 'gpu-price-hr', 4)],
      ['azure-eastus', entity('azure-eastus', EntityType.CLOUD_REGION, 'gpu-price-hr', 2)],
    ]);

    const cities = aggregateToCities(entities, crossRef);

    expect(cities.get('ashburn')!.gpu_supply).toBeCloseTo(0.375);
    expect(cities.get('ashburn')!.cloud_region_density).toBe(2);
  });
});

describe('riskForEntity', () => {
  it('resolves country risk through cloud-region crossref', () => {
    expect(riskForEntity(
      entity('azure-chinaeast2', EntityType.CLOUD_REGION, 'gpu-price-hr', 1),
      crossRef,
      riskTiers,
    )).toEqual({ riskTier: 'sanctioned', riskMultiplier: 0.3 });
  });
});
