/** Data source layer classification for scrapers */
export enum DataSourceLayer {
  STRUCTURED_API = 'structured_api',
  RSS_RULES = 'rss_rules',
  LLM_EXTRACTION = 'llm_extraction',
  MANUAL = 'manual',
}

/** Entity type classification */
export enum EntityType {
  COUNTRY = 'country',
  CITY = 'city',
  CLOUD_REGION = 'cloud-region',
  COMPANY = 'company',
}

/** Configuration options for a scraper */
export interface ScraperConfig {
  /** Minimum delay between requests in milliseconds */
  rateLimitMs?: number;
  /** Maximum number of retries (default: 3) */
  maxRetries?: number;
  /** Per-request timeout in milliseconds */
  timeoutMs?: number;
}

/** Normalized record produced by all scrapers */
export interface NormalizedRecord {
  /** Data source identifier (e.g. "aws-pricing") */
  source: string;
  /** Entity this record describes */
  entity: {
    /** Lowercase kebab-case identifier (e.g. "aws-us-east-1") */
    id: string;
    /** Entity type classification */
    type: EntityType;
    /** Human-readable name (e.g. "US East (N. Virginia)") */
    name: string;
  };
  /** Metric identifier (e.g. "gpu-price-hr") */
  metric: string;
  /** Metric value */
  value: number;
  /** Unit of measurement (e.g. "USD/hr") */
  unit: string;
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Confidence score 1-5 */
  confidence: number;
}

/** Scraper interface - all scrapers implement this */
export interface Scraper {
  /** Unique scraper name */
  readonly name: string;
  /** Data source layer classification */
  readonly source: DataSourceLayer;
  /** Optional scraper configuration */
  readonly config?: ScraperConfig;
  /** Fetch normalized records from the data source */
  fetch(): Promise<NormalizedRecord[]>;
}

/** Per-entity file stored in public/data/entities/ */
export interface EntityFile {
  /** Entity identifier */
  id: string;
  /** Entity type */
  type: EntityType;
  /** Most recent record */
  latest: NormalizedRecord;
  /** Full time-series array */
  series: NormalizedRecord[];
  /** SHA-256 hash of series for incremental updates */
  _hash: string;
  /** ISO 8601 last-updated timestamp */
  _updatedAt: string;
}

/** Pipeline metadata stored in _pipeline-meta.json */
export interface PipelineMeta {
  /** ISO 8601 timestamp of last pipeline run */
  lastRun: string;
  /** Per-entity hash and update tracking */
  entities: Record<string, { hash: string; updatedAt: string }>;
}

/** Compiled entity in aggregate output files */
export interface CompiledEntity {
  /** Entity type */
  type: EntityType;
  /** Human-readable entity name */
  name: string;
  /** Computed score (Phase 1: raw value) */
  score: number;
  /** Individual factors contributing to score */
  factors: Record<string, number>;
  /** Confidence score 1-5 */
  confidence: number;
  /** ISO 8601 last-updated timestamp */
  lastUpdated: string;
  /** Export control risk tier name */
  riskTier?: string;
  /** Export control risk multiplier (0.3-1.0) */
  riskMultiplier?: number;
  /** Per-factor breakdown: raw value, normalized 0-100, and weight */
  factorBreakdown?: Record<string, { raw: number; normalized: number; weight: number }>;
  /** Data completeness: 'full' if >=3 factors, 'partial' if <3 */
  dataCompleteness?: 'full' | 'partial';
}

/** Index configuration loaded from public/data/index-config.json */
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

/** Export control tier definitions loaded from scripts/mappings/export-control-tiers.json */
export interface ExportControlTiers {
  version: number;
  tiers: Record<string, { multiplier: number; description: string }>;
  countries: Record<string, string>;
}

/** Entity cross-reference mapping loaded from scripts/mappings/entity-crossref.json */
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
