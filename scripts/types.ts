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
}
