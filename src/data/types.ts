export enum EntityType {
  COUNTRY = 'country',
  CITY = 'city',
  CLOUD_REGION = 'cloud-region',
  COMPANY = 'company',
}

export type EntityLevel = EntityType | 'data-center-cluster';

export interface NormalizedRecord {
  source: string;
  entity: {
    id: string;
    type: EntityType;
    name: string;
  };
  metric: string;
  value: number;
  unit: string;
  timestamp: string;
  confidence: number;
}

export interface EntityFile {
  id: string;
  type: EntityType;
  latest: NormalizedRecord;
  series: NormalizedRecord[];
  _hash: string;
  _updatedAt: string;
}

export interface CompiledEntity {
  type: EntityType;
  name: string;
  score: number;
  factors: Record<string, number>;
  confidence: number;
  lastUpdated: string;
  riskTier?: string;
  riskMultiplier?: number;
  factorBreakdown?: Record<string, { raw: number; normalized: number; weight: number }>;
  dataCompleteness?: 'full' | 'partial';
}

export interface IndexConfig {
  version: number;
  factors: Record<string, { weight: number; description: string }>;
  confidence: {
    staleDays: number;
    stalePenalty: number;
    veryStaleDays: number;
    veryStalePenalty: number;
    missingFactorPenalty: number;
    minConfidence: number;
  };
}

export interface EntityCrossRef {
  countries: Record<string, {
    iso2: string;
    iso3: string;
    worldBankCode: string;
    owidName: string;
    name: string;
  }>;
  cloudRegions: Record<string, { country: string; city: string; provider: string }>;
  cities: Record<string, { country: string; name: string }>;
  companies: Record<string, { cik: string; country: string; name: string }>;
}

export interface LatestIndex {
  generated: string;
  entities: Record<string, CompiledEntity>;
}

export interface RankingEntry {
  rank: number;
  entityId: string;
  score: number;
  confidence: number;
}

export interface RankingsIndex {
  generated: string;
  byType: Record<'countries' | 'cities' | 'cloudRegions' | 'companies', RankingEntry[]>;
}

export interface HistoryEntry {
  type: EntityType;
  name: string;
  series: Array<{ timestamp: string; score: number; factors: Record<string, number> }>;
}

export type HistoryIndex = Record<string, HistoryEntry>;

export interface DerivedClusterNode {
  id: `${string}-cluster`;
  level: 'data-center-cluster';
  parentCloudRegionId: string;
  provider: string;
  country: string;
  city: string;
  label: string;
  description: string;
}
