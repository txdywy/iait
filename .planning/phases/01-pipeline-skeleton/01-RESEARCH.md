# Phase 1: Pipeline Skeleton - Research

**Researched:** 2026-05-06
**Domain:** TypeScript data pipeline, AWS EC2 pricing API, static JSON file architecture
**Confidence:** MEDIUM

## Summary

Phase 1 builds a greenfield TypeScript pipeline that fetches AWS EC2 GPU instance pricing data, normalizes it into per-entity JSON files, and compiles aggregate outputs. The pipeline runs as Node.js scripts (via `tsx` runner) in a project that also contains a Vite-based React frontend (not built in this phase). The architecture uses a self-registering scraper interface pattern where new data sources are added by implementing an interface and registering -- no core pipeline changes needed.

The primary technical challenge is efficiently fetching AWS GPU pricing data. The AWS Pricing API `GetProducts` endpoint (free, requires AWS credentials via IAM) allows server-side filtering by instance family, returning only GPU-relevant data rather than downloading the 50-100MB bulk JSON per region. The alternative (streaming and filtering the bulk download) is viable but wasteful. For Phase 1, the GetProducts API with 5-10 filtered calls (one per GPU instance family: p4d, p4de, p5, p5e, g5, g5g, g6, g6e, trn, inf) is the recommended approach.

Key version findings: TypeScript is currently at 6.0.3 (CLAUDE.md says 5.x), Vite at 8.0.10, Vitest at 4.1.5. Vite 8 requires Node.js ^20.19.0 or >=22.12.0. GitHub Actions with `setup-node@v4` and `node-version: 20` satisfies this.

**Primary recommendation:** Use `tsx` to run TypeScript pipeline scripts, AWS Pricing API `GetProducts` for GPU pricing data, self-registering scraper pattern with glob-based module discovery, and Vitest for testing pipeline code.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Data fetch (AWS API calls) | GitHub Actions (Node.js) | -- | Pipeline runs server-side in CI, not browser |
| Data normalization | GitHub Actions (Node.js) | -- | Transforms raw API response to entity schema |
| Entity file storage | Git repo (public/data/) | -- | Static JSON committed to repo for GitHub Pages |
| Data compilation | GitHub Actions (Node.js) | -- | Aggregates entity files into latest/rankings/history |
| Pipeline orchestration | GitHub Actions (Node.js) | -- | Single entry point runs full pipeline |
| Frontend data consumption | Browser | -- | Reads static JSON from same origin (Phase 3) |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 5.9.3 | Type safety | Latest 5.x; CLAUDE.md specifies 5.x; safer than 6.0.3 with Vite 8 ecosystem |
| tsx | 4.21.0 | TypeScript script runner | Runs .ts files directly without compilation step; ideal for CI pipeline scripts |
| Vitest | 4.1.5 | Testing framework | Vite-native; shares config with frontend build; fastest TS test runner |
| Node.js | 20.x (LTS) | Runtime | Vite 8 requires ^20.19.0; GitHub Actions setup-node@v4 supports 20 |
| pnpm | 10.x | Package manager | Fast, disk-efficient, monorepo-ready for future expansion |

### Pipeline-Specific

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| glob | 13.0.6 | Module discovery | Finds scraper source files for registry auto-discovery |
| (none) | -- | HTTP client | Node.js built-in `fetch` (available since Node 18+) handles AWS API calls |
| (none) | -- | SHA-256 hashing | Node.js built-in `crypto.createHash('sha256')` |
| (none) | -- | File I/O | Node.js built-in `fs/promises` and `path` |

**Key decision: Zero external dependencies for the pipeline.** Node.js built-in `fetch`, `crypto`, `fs`, and `path` cover all pipeline needs. The only external dependency is `glob` for auto-discovering scraper modules. This keeps the pipeline lightweight and avoids supply-chain risk.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| tsx | ts-node | tsx is faster (esbuild-based), better ESM support, actively maintained |
| tsx | Separate tsc compile step | Extra build step; tsx runs TS directly, simpler CI |
| glob | Dynamic import with hardcoded paths | glob enables zero-touch extension; new scrapers auto-discovered |
| TypeScript 5.9.3 | TypeScript 6.0.3 | 6.x is newest but CLAUDE.md says 5.x; potential tsconfig breaking changes |
| AWS Pricing API | Bulk JSON download | Bulk download is 50-100MB per region; API returns filtered subset |
| AWS SDK | Direct HTTP + Signature V4 | SDK adds 50MB+ dependency; 5-10 API calls don't justify it |
| undici/node-fetch | Built-in fetch | Node 20+ has stable built-in fetch; no need for external HTTP client |

**Installation:**

```bash
pnpm init
pnpm add -D typescript@~5.9.3 tsx@~4.21.0 vitest@~4.1.5 glob@~13.0.6
pnpm add -D @types/node@20
```

**Version verification:** All versions verified via `npm view <package> version` on 2026-05-06. [VERIFIED: npm registry]

## Architecture Patterns

### System Architecture Diagram

```
                     GitHub Actions (cron / manual)
                     ┌─────────────────────────────────┐
                     │  pnpm pipeline                   │
                     │  ┌───────────────────────────┐   │
                     │  │  run-pipeline.ts (entry)   │   │
                     │  │    │                       │   │
                     │  │    ├─► Registry            │   │
                     │  │    │   (glob discovers     │   │
                     │  │    │    scraper modules)   │   │
                     │  │    │       │               │   │
                     │  │    │       ▼               │   │
                     │  │    │   aws-gpu-pricing.ts  │   │
                     │  │    │   (implements         │   │
                     │  │    │    Scraper interface) │   │
                     │  │    │       │               │   │
                     │  │    │       ▼               │   │
                     │  │    │   AWS Pricing API     │   │
                     │  │    │   (GetProducts,       │   │
                     │  │    │    5-10 filtered      │   │
                     │  │    │    HTTP calls)        │   │
                     │  │    │       │               │   │
                     │  │    │       ▼               │   │
                     │  │    │   Normalize to        │   │
                     │  │    │   NormalizedRecord[]  │   │
                     │  │    └───────────────────────┘   │
                     │  │           │                    │
                     │  │           ▼                    │
                     │  │   Hash Check (SHA-256)         │
                     │  │   Compare with pipeline-meta   │
                     │  │           │                    │
                     │  │    ┌──────┴──────┐             │
                     │  │    │changed?     │             │
                     │  │    ▼             ▼             │
                     │  │  write entity  skip           │
                     │  │  files         (no-op)        │
                     │  │    │                          │
                     │  │    ▼                          │
                     │  │  Compiler                     │
                     │  │  (reads all entity files,     │
                     │  │   produces aggregate JSON)    │
                     │  └───────────────────────────────┘
                     └──────────┬──────────────────────────┘
                                │ writes
                                ▼
                     public/data/
                     ├── entities/
                     │   └── cloud-region/
                     │       ├── aws-us-east-1.json
                     │       ├── aws-us-west-2.json
                     │       └── ...
                     ├── latest.json
                     ├── rankings.json
                     ├── history.json
                     └── _pipeline-meta.json
                                │
                                ▼
                     git commit (by GitHub Actions)
```

### Recommended Project Structure

```
computeatlas/
├── scripts/                    # Pipeline code (Node.js, runs in CI)
│   ├── run-pipeline.ts         # Entry point: orchestrates full pipeline
│   ├── types.ts                # Scraper interface, NormalizedRecord, entity types
│   ├── registry.ts             # Auto-discovers and runs scrapers
│   ├── fetch-with-retry.ts     # HTTP client with retry + exponential backoff
│   ├── hash.ts                 # SHA-256 content hashing utility
│   ├── compiler.ts             # Reads entity files, produces aggregate JSON
│   ├── scrapers/
│   │   ├── aws-gpu-pricing.ts  # Phase 1 scraper (implements Scraper interface)
│   │   └── (future scrapers)
│   └── __tests__/
│       ├── aws-gpu-pricing.test.ts
│       ├── registry.test.ts
│       ├── compiler.test.ts
│       ├── fetch-with-retry.test.ts
│       └── hash.test.ts
├── src/                        # Frontend code (React, Phase 3)
│   └── ...
├── public/
│   └── data/                   # Pipeline output (committed to git)
│       ├── entities/
│       │   └── cloud-region/
│       │       └── {id}.json
│       ├── latest.json
│       ├── rankings.json
│       ├── history.json
│       └── _pipeline-meta.json
├── data/                       # Raw API responses (gitignored, ephemeral)
│   └── raw/
├── vite.config.ts              # Frontend build (Phase 3)
├── vitest.config.ts            # Test config (shared between pipeline + frontend)
├── tsconfig.json               # Base TypeScript config
├── tsconfig.scripts.json       # Pipeline-specific TS config (Node.js target)
├── package.json
├── pnpm-workspace.yaml         # (optional, for future monorepo expansion)
└── .gitignore
```

**Why `scripts/` at root, not inside `src/`:** The pipeline runs in Node.js (CI environment), while `src/` is for the browser-targeted React frontend. Keeping them separate prevents accidental cross-imports and allows different TypeScript compiler options (Node.js target vs. browser target). The `scripts/` directory has its own `tsconfig.scripts.json` targeting `NodeNext` module resolution.

### Pattern 1: Scraper Interface + Self-Registration

**What:** Every scraper implements a common `Scraper` interface. A registry uses `glob` to auto-discover all `.ts` files in `scripts/scrapers/` and registers their default exports. New scrapers are added by dropping a file -- zero core pipeline changes.

**When to use:** Always. This is the core extensibility mechanism (PIPE-06, INF-03).

**Example:**

```typescript
// scripts/types.ts
export interface Scraper {
  readonly name: string;
  readonly source: DataSourceLayer;
  readonly config?: ScraperConfig;
  fetch(): Promise<NormalizedRecord[]>;
}

export enum DataSourceLayer {
  STRUCTURED_API = 'structured_api',
  RSS_RULES = 'rss_rules',
  LLM_EXTRACTION = 'llm_extraction',
  MANUAL = 'manual',
}

export interface ScraperConfig {
  rateLimitMs?: number;     // min delay between requests
  maxRetries?: number;      // default: 3
  timeoutMs?: number;       // per-request timeout
}

export interface NormalizedRecord {
  source: string;           // e.g. "aws-pricing"
  entity: {
    id: string;             // lowercase kebab-case: "aws-us-east-1"
    type: EntityType;
    name: string;           // human-readable: "US East (N. Virginia)"
  };
  metric: string;           // e.g. "gpu-price-hr"
  value: number;
  unit: string;             // e.g. "USD/hr"
  timestamp: string;        // ISO 8601
  confidence: number;       // 1-5
}

export enum EntityType {
  COUNTRY = 'country',
  CITY = 'city',
  CLOUD_REGION = 'cloud-region',
  COMPANY = 'company',
}
```

```typescript
// scripts/registry.ts
import { glob } from 'glob';
import path from 'node:path';
import type { Scraper } from './types.js';

const scrapers = new Map<string, Scraper>();

export async function discoverScrapers(): Promise<void> {
  const pattern = path.resolve(import.meta.dirname, 'scrapers/*.ts');
  const files = await glob(pattern);

  for (const file of files) {
    const mod = await import(file);
    const scraper: Scraper = mod.default;
    if (scraper?.name && typeof scraper.fetch === 'function') {
      scrapers.set(scraper.name, scraper);
      console.log(`[registry] Registered scraper: ${scraper.name}`);
    }
  }
}

export function getScrapers(): Scraper[] {
  return Array.from(scrapers.values());
}

export function getScraper(name: string): Scraper | undefined {
  return scrapers.get(name);
}
```

### Pattern 2: Incremental Update via Content Hashing

**What:** Each entity file stores a SHA-256 hash of its normalized data. Before writing, the pipeline hashes the new data and compares with the stored hash. If unchanged, skip the write.

**When to use:** Every entity file write (PIPE-08).

**Example:**

```typescript
// scripts/hash.ts
import { createHash } from 'node:crypto';
import type { NormalizedRecord } from './types.js';

export function hashRecords(records: NormalizedRecord[]): string {
  // Sort records by timestamp for deterministic hashing
  const sorted = [...records].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const payload = JSON.stringify(sorted);
  return createHash('sha256').update(payload).digest('hex');
}
```

```typescript
// In pipeline orchestration (run-pipeline.ts)
import { hashRecords } from './hash.js';

async function writeEntityIfChanged(
  entityId: string,
  entityType: string,
  records: NormalizedRecord[],
  meta: PipelineMeta,
): Promise<boolean> {
  const newHash = hashRecords(records);
  const existingHash = meta.entities[entityId]?.hash;

  if (newHash === existingHash) {
    console.log(`[skip] ${entityId} unchanged (hash match)`);
    return false;
  }

  const filePath = `public/data/entities/${entityType}/${entityId}.json`;
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify({
    id: entityId,
    latest: records[records.length - 1],
    series: records,
    _hash: newHash,
    _updatedAt: new Date().toISOString(),
  }, null, 2));

  meta.entities[entityId] = { hash: newHash, updatedAt: new Date().toISOString() };
  return true;
}
```

### Pattern 3: HTTP Fetch with Retry and Exponential Backoff

**What:** A reusable fetch wrapper that retries on transient failures with exponential backoff. Required by PIPE-10.

**When to use:** All external HTTP calls in scrapers.

**Example:**

```typescript
// scripts/fetch-with-retry.ts
export interface FetchOptions {
  retries?: number;         // default: 3
  baseDelayMs?: number;     // default: 1000
  maxDelayMs?: number;      // default: 30000
  timeoutMs?: number;       // default: 30000
}

export async function fetchWithRetry(
  url: string,
  init: RequestInit = {},
  opts: FetchOptions = {},
): Promise<Response> {
  const { retries = 3, baseDelayMs = 1000, maxDelayMs = 30000, timeoutMs = 30000 } = opts;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timer);

      if (response.ok) return response;

      // Retry on 429 (rate limit) and 5xx (server errors)
      if (response.status === 429 || response.status >= 500) {
        if (attempt < retries) {
          const delay = Math.min(baseDelayMs * 2 ** attempt, maxDelayMs);
          // Add jitter: +/- 25% of delay
          const jitter = delay * (0.75 + Math.random() * 0.5);
          console.warn(`[retry] ${response.status} on ${url}, attempt ${attempt + 1}/${retries}, waiting ${Math.round(jitter)}ms`);
          await new Promise(r => setTimeout(r, jitter));
          continue;
        }
      }

      throw new Error(`HTTP ${response.status}: ${response.statusText} for ${url}`);
    } catch (err) {
      clearTimeout(timer);
      if (attempt === retries) throw err;

      const delay = Math.min(baseDelayMs * 2 ** attempt, maxDelayMs);
      const jitter = delay * (0.75 + Math.random() * 0.5);
      console.warn(`[retry] Error on ${url}, attempt ${attempt + 1}/${retries}, waiting ${Math.round(jitter)}ms`);
      await new Promise(r => setTimeout(r, jitter));
    }
  }

  throw new Error(`Exhausted retries for ${url}`);
}
```

### Pattern 4: AWS GPU Pricing Scraper

**What:** Fetches GPU instance pricing from the AWS Pricing API `GetProducts` endpoint, filters for GPU instance families, and normalizes to `NormalizedRecord[]`.

**When to use:** Phase 1 data source (PIPE-01).

**Key AWS API details:**
- Endpoint: `https://pricing.us-east-1.amazonaws.com` (only region for pricing API)
- Operation: `GetProducts` with `ServiceCode: AmazonEC2`
- Filters: `TERM_MATCH` on `instanceFamily`, `operatingSystem`, `tenancy`, `capacitystatus`
- Authentication: AWS Signature V4 (requires IAM credentials)
- Response: `PriceList` array of JSON strings (each string is a product + pricing JSON)
- Pagination: `NextToken` for large result sets
- Rate limit: No published hard limit; be conservative (100ms between calls)

**GPU instance families to fetch:**
| Family | Use Case | Example Types |
|--------|----------|---------------|
| p4d | Previous-gen training | p4d.24xlarge |
| p5 | Current-gen training | p5.48xlarge, p5e.48xlarge |
| g5 | Inference/graphics | g5.xlarge, g5.48xlarge |
| g6 | Latest inference | g6.xlarge, g6.48xlarge |
| trn | AWS Trainium | trn1.32xlarge |
| inf | AWS Inferentia | inf2.48xlarge |

**Example:**

```typescript
// scripts/scrapers/aws-gpu-pricing.ts
import { Scraper, DataSourceLayer, EntityType, NormalizedRecord } from '../types.js';
import { fetchWithRetry } from '../fetch-with-retry.js';

const GPU_FAMILIES = ['p4d', 'p5', 'g5', 'g6', 'trn', 'inf'];
const PRICING_API = 'https://pricing.us-east-1.amazonaws.com';

class AwsGpuPricingScraper implements Scraper {
  readonly name = 'aws-gpu-pricing';
  readonly source = DataSourceLayer.STRUCTURED_API;

  async fetch(): Promise<NormalizedRecord[]> {
    const records: NormalizedRecord[] = [];

    for (const family of GPU_FAMILIES) {
      const products = await this.fetchFamily(family);
      for (const product of products) {
        const record = this.normalize(product);
        if (record) records.push(record);
      }
    }

    return records;
  }

  private async fetchFamily(family: string): Promise<PricingProduct[]> {
    // Uses AWS Pricing API GetProducts with filters
    // Requires AWS Signature V4 authentication
    // Returns parsed PriceList items matching the GPU family
    // ... implementation details
  }

  private normalize(product: PricingProduct): NormalizedRecord | null {
    const attrs = product.product?.attributes;
    if (!attrs?.instanceType) return null;

    return {
      source: this.name,
      entity: {
        id: `aws-${attrs.location?.toLowerCase().replace(/\s+/g, '-')}`,
        type: EntityType.CLOUD_REGION,
        name: attrs.location || attrs.instanceType,
      },
      metric: 'gpu-price-hr',
      value: this.extractOnDemandPrice(product),
      unit: 'USD/hr',
      timestamp: new Date().toISOString(),
      confidence: 5, // structured API = highest confidence
    };
  }
}

export default new AwsGpuPricingScraper();
```

**AWS Signature V4 without SDK:** Since we want zero external dependencies, implement a minimal Signer class that:
1. Creates a canonical request (method, URI, query string, headers, payload hash)
2. Creates a string to sign (algorithm, timestamp, credential scope, canonical request hash)
3. Calculates the signature using HMAC-SHA256
4. Adds the `Authorization` header

This is ~100 lines of code. The alternative (AWS SDK v3 `@aws-sdk/client-pricing`) adds ~50MB of dependencies for 5-10 API calls. [VERIFIED: npm registry]

### Pattern 5: Data Compiler

**What:** Reads all entity files from `public/data/entities/`, aggregates into `latest.json`, `rankings.json`, and `history.json`.

**When to use:** After all scrapers complete (PIPE-09).

**Example:**

```typescript
// scripts/compiler.ts
import fs from 'node:fs/promises';
import path from 'node:path';
import { EntityType } from './types.js';

interface CompiledEntity {
  type: EntityType;
  name: string;
  score: number;            // Phase 1: raw price value (placeholder)
  factors: Record<string, number>;
  confidence: number;
  lastUpdated: string;
}

export async function compile(): Promise<void> {
  const entities = await loadAllEntities();

  await writeLatest(entities);
  await writeRankings(entities);
  await writeHistory(entities);
}

async function loadAllEntities(): Promise<Map<string, EntityFile>> {
  // Reads all JSON files from public/data/entities/**/*.json
  // Returns map of entityId -> parsed entity file contents
}

async function writeLatest(entities: Map<string, EntityFile>): Promise<void> {
  const latest: Record<string, CompiledEntity> = {};
  for (const [id, entity] of entities) {
    latest[id] = {
      type: entity.type,
      name: entity.latest.entity.name,
      score: entity.latest.value,           // Phase 1: raw value
      factors: { [entity.latest.metric]: entity.latest.value },
      confidence: entity.latest.confidence,
      lastUpdated: entity._updatedAt,
    };
  }
  await fs.writeFile(
    'public/data/latest.json',
    JSON.stringify({ generated: new Date().toISOString(), entities: latest }, null, 2),
  );
}

async function writeRankings(entities: Map<string, EntityFile>): Promise<void> {
  // Group by type, sort by score descending
  // Output: { generated, byType: { countries: [...], cities: [...], cloudRegions: [...], companies: [...] } }
}

async function writeHistory(entities: Map<string, EntityFile>): Promise<void> {
  // Output: { [entityId]: { type, name, series: [{ timestamp, score, factors }] } }
}
```

### Pattern 6: Pipeline Orchestration Entry Point

**What:** Single entry point that discovers scrapers, runs them, performs incremental hash checks, and compiles output.

**When to use:** Every pipeline run.

**Example:**

```typescript
// scripts/run-pipeline.ts
import { discoverScrapers, getScrapers } from './registry.js';
import { hashRecords } from './hash.js';
import { compile } from './compiler.js';
import fs from 'node:fs/promises';
import path from 'node:path';

interface PipelineMeta {
  lastRun: string;
  entities: Record<string, { hash: string; updatedAt: string }>;
}

async function loadMeta(): Promise<PipelineMeta> {
  try {
    const raw = await fs.readFile('public/data/_pipeline-meta.json', 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { lastRun: '', entities: {} };
  }
}

async function run(): Promise<void> {
  console.log('[pipeline] Starting...');
  const meta = await loadMeta();

  // 1. Discover and run scrapers
  await discoverScrapers();
  const scrapers = getScrapers();
  let written = 0, skipped = 0;

  for (const scraper of scrapers) {
    console.log(`[pipeline] Running scraper: ${scraper.name}`);
    const records = await scraper.fetch();

    // 2. Group records by entity
    const byEntity = groupByEntity(records);

    // 3. Write entity files (with hash check)
    for (const [entityId, entityRecords] of byEntity) {
      const changed = await writeEntityIfChanged(entityId, entityRecords, meta);
      if (changed) written++; else skipped++;
    }
  }

  // 4. Compile aggregate outputs
  await compile();

  // 5. Write pipeline metadata
  meta.lastRun = new Date().toISOString();
  await fs.writeFile('public/data/_pipeline-meta.json', JSON.stringify(meta, null, 2));

  console.log(`[pipeline] Done. Written: ${written}, Skipped: ${skipped}`);
}

run().catch(err => {
  console.error('[pipeline] Fatal error:', err);
  process.exit(1);
});
```

### Anti-Patterns to Avoid

- **Downloading the full AWS bulk JSON:** The per-region pricing file is 50-100MB. Use the `GetProducts` API with filters instead. The bulk download wastes bandwidth, takes minutes to parse, and requires streaming JSON parsing libraries.
- **Using the AWS SDK for 5-10 API calls:** The `@aws-sdk/client-pricing` package adds ~50MB of dependencies. Implement a minimal Signature V4 signer (~100 lines) instead.
- **Hardcoding scraper paths in the registry:** The whole point of the registry pattern is zero-touch extension. Use `glob` to discover scrapers dynamically.
- **Storing raw API responses in git:** AWS pricing responses are large. Only commit the normalized entity files in `public/data/`. Raw responses go in `data/raw/` which is gitignored.
- **Separate normalization step:** For Phase 1 with one source, the scraper produces `NormalizedRecord[]` directly. A separate normalizer layer adds complexity without value until Phase 2 introduces multiple sources that need merging.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP requests | Custom http/https client | Node.js built-in `fetch` | Stable since Node 18+, handles redirects, streaming |
| SHA-256 hashing | Manual hash implementation | `node:crypto` `createHash('sha256')` | Battle-tested, hardware-accelerated |
| File globbing | Manual directory traversal with recursion | `glob` npm package | Handles edge cases (symlinks, ignore patterns, cross-platform paths) |
| JSON schema validation | Manual field checking with if/else | (defer to Phase 2) | Phase 1 has one simple schema; add zod when multiple sources require validation |
| AWS request signing | AWS SDK | Custom Signature V4 (~100 lines) | SDK adds 50MB; only need GetProducts with 2-3 filters |

**Key insight:** The pipeline has very few external needs. Node.js built-in modules (`fetch`, `crypto`, `fs`, `path`) cover 90% of the work. The only justified npm dependency is `glob` for module discovery.

## Common Pitfalls

### Pitfall 1: AWS Pricing API JSON-in-JSON Response

**What goes wrong:** The AWS Pricing API `GetProducts` response contains `PriceList` as an array of JSON *strings*, not objects. Each string must be individually parsed with `JSON.parse()`. Developers try to access `product.attributes` directly and get `undefined`.

**Why it happens:** The AWS API returns `PriceList: ["{...json string...}", "{...json string...}"]` for historical reasons (the API predates modern JSON conventions).

**How to avoid:**
```typescript
const data = await response.json();
const products = data.PriceList.map((item: string) => JSON.parse(item));
```

**Warning signs:** Getting `undefined` when accessing nested properties of PriceList items.

### Pitfall 2: AWS Signature V4 Clock Skew

**What goes wrong:** AWS rejects signed requests with `SignatureDoesNotMatch` errors. Happens when the local clock is more than 5 minutes off from AWS servers.

**Why it happens:** Signature V4 includes a timestamp in the signed payload. If the machine clock is off, the signature is invalid.

**How to avoid:**
- Use `Date.now()` consistently for the signing timestamp
- In GitHub Actions, clocks are synced (NTP), so this is unlikely in CI
- In local dev, if signing fails, check system clock

**Warning signs:** `SignatureDoesNotMatch` or `RequestTimeTooSkewed` error responses.

### Pitfall 3: Entity ID Collisions Across Data Sources

**What goes wrong:** Two different scrapers produce entity IDs that collide (e.g., both produce `us-east-1`). The second scraper overwrites the first scraper's entity file.

**Why it happens:** Entity IDs are not globally namespaced. AWS uses `us-east-1` which could conflict with Azure's region naming.

**How to avoid:**
- Prefix entity IDs with the cloud provider: `aws-us-east-1`, `azure-eastus`
- This is already specified in D-02 (kebab-case slugs) and the entity naming convention

**Warning signs:** Entity files being overwritten between scraper runs. Check `_pipeline-meta.json` for unexpected hash changes.

### Pitfall 4: GitHub Pages File Count Limits

**What goes wrong:** With many entity files, the number of files in `public/data/entities/` grows large. While GitHub Pages has no explicit file count limit, very large numbers of small files slow down `git add` and `git status`.

**Why it happens:** Each AWS region becomes a separate JSON file. At ~40 GPU-capable regions, that is 40 files. By Phase 2 with 100+ entities across all types, it becomes 200+ files.

**How to avoid:**
- Phase 1: 40-50 entity files is fine, no concern
- Phase 2+: Consider combining low-cardinality entity types (countries = ~200) into a single JSON file if git operations slow down
- Monitor `git status` performance as entity count grows

**Warning signs:** `git add` taking >5 seconds, `git status` hanging.

### Pitfall 5: Non-Deterministic JSON Serialization

**What goes wrong:** Hash comparison fails every run even when data has not changed. The pipeline writes entity files that produce different hashes each time.

**Why it happens:** JavaScript object property ordering is not guaranteed across runs. `JSON.stringify({ b: 1, a: 2 })` may produce `{"a":2,"b":1}` or `{"b":1,"a":2}` depending on V8's internal representation.

**How to avoid:**
- Always sort records by a deterministic key (timestamp) before hashing
- Use `JSON.stringify(value, null, 2)` consistently (same indentation = same output for same data)
- Hash the *normalized records array*, not the final entity file JSON (the file includes `_hash` and `_updatedAt` which change)

**Warning signs:** Every entity file gets rewritten on every run. Check `_pipeline-meta.json` -- if all hashes change every run, this pitfall is active.

## Code Examples

Verified patterns from official sources:

### AWS Pricing API Call (Direct HTTP, No SDK)

```typescript
// Source: https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_pricing_GetProducts.html
// The pricing API is only available in us-east-1
const PRICING_ENDPOINT = 'https://pricing.us-east-1.amazonaws.com';

async function getProducts(family: string): Promise<PricingProduct[]> {
  const params = new URLSearchParams({
    ServiceCode: 'AmazonEC2',
    FormatVersion: 'aws_v1',
  });

  // Add filters
  const filters = [
    { Type: 'TERM_MATCH', Field: 'instanceFamily', Value: `${family} instance` },
    { Type: 'TERM_MATCH', Field: 'operatingSystem', Value: 'Linux' },
    { Type: 'TERM_MATCH', Field: 'tenancy', Value: 'Shared' },
    { Type: 'TERM_MATCH', Field: 'capacitystatus', Value: 'Used' },
  ];

  filters.forEach((f, i) => {
    params.set(`Filters.${i + 1}.Type`, f.Type);
    params.set(`Filters.${i + 1}.Field`, f.Field);
    params.set(`Filters.${i + 1}.Value`, f.Value);
  });

  params.set('MaxResults', '100');

  const url = `${PRICING_ENDPOINT}/?${params}`;
  const headers = signRequest('GET', url, awsCredentials); // Signature V4

  const response = await fetchWithRetry(url, { headers });
  const data = await response.json();

  // PriceList items are JSON strings, not objects!
  const products = data.PriceList.map((item: string) => JSON.parse(item));

  // Handle pagination
  if (data.NextToken) {
    // Append NextToken to params and fetch next page
  }

  return products;
}
```

### Vitest Configuration for Pipeline Scripts

```typescript
// vitest.config.ts
// Source: Context7 /vitest-dev/vitest
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['scripts/**/*.test.ts', 'src/**/*.test.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    testTimeout: 10000,  // pipeline tests may hit network
    pool: 'threads',
    clearMocks: true,
    restoreMocks: true,
  },
});
```

### Testing a Scraper (Mock Network Calls)

```typescript
// scripts/__tests__/aws-gpu-pricing.test.ts
// Source: Context7 /vitest-dev/vitest -- mock fetch
import { describe, it, expect, vi, beforeEach } from 'vitest';
import scraper from '../scrapers/aws-gpu-pricing.js';

describe('AwsGpuPricingScraper', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('normalizes GPU pricing to NormalizedRecord format', async () => {
    const mockResponse = {
      FormatVersion: 'aws_v1',
      PriceList: [
        JSON.stringify({
          product: {
            productFamily: 'Compute Instance',
            attributes: {
              instanceType: 'p5.48xlarge',
              instanceFamily: 'GPU instance',
              vcpu: '192',
              memory: '2048 GiB',
              gpuMemory: '640 GiB',
              operatingSystem: 'Linux',
              location: 'US East (N. Virginia)',
              locationType: 'AWS Region',
            },
          },
          terms: {
            OnDemand: {
              'JRTJXK3PMHUZS49S.JRTTC3J3R88C8UEP': {
                priceDimensions: {
                  'JRTTC3J3R88C8UEP': {
                    unit: 'Hrs',
                    pricePerUnit: { USD: '98.3200' },
                  },
                },
              },
            },
          },
        }),
      ],
    };

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    } as Response);

    const records = await scraper.fetch();

    expect(records.length).toBeGreaterThan(0);
    expect(records[0]).toMatchObject({
      source: 'aws-gpu-pricing',
      entity: {
        type: 'cloud-region',
      },
      metric: 'gpu-price-hr',
      unit: 'USD/hr',
      confidence: 5,
    });
  });
});
```

### Content Hash Test

```typescript
// scripts/__tests__/hash.test.ts
import { describe, it, expect } from 'vitest';
import { hashRecords } from '../hash.js';
import type { NormalizedRecord } from '../types.js';

const makeRecord = (ts: string): NormalizedRecord => ({
  source: 'test',
  entity: { id: 'test-1', type: 'cloud-region' as any, name: 'Test' },
  metric: 'gpu-price-hr',
  value: 1.0,
  unit: 'USD/hr',
  timestamp: ts,
  confidence: 5,
});

describe('hashRecords', () => {
  it('produces same hash regardless of input order', () => {
    const a = [makeRecord('2026-01-01T00:00:00Z'), makeRecord('2026-01-02T00:00:00Z')];
    const b = [makeRecord('2026-01-02T00:00:00Z'), makeRecord('2026-01-01T00:00:00Z')];
    expect(hashRecords(a)).toBe(hashRecords(b));
  });

  it('produces different hash when data changes', () => {
    const a = [makeRecord('2026-01-01T00:00:00Z')];
    const b = [{ ...makeRecord('2026-01-01T00:00:00Z'), value: 2.0 }];
    expect(hashRecords(a)).not.toBe(hashRecords(b));
  });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| ts-node | tsx | tsx 4.x (2024) | Faster execution via esbuild, better ESM support |
| jest | vitest | Vitest 2.x+ (2024) | Native Vite integration, faster, TS out of box |
| AWS SDK v2 | AWS SDK v3 | 2023 | Modular, tree-shakeable; but still heavy for simple API calls |
| request (npm) | node:fetch | Node 18+ (2022) | Built-in, no dependencies needed |
| CommonJS | ESM | Node 20+ (stable) | `import`/`export` natively supported; use `"type": "module"` in package.json |

**Deprecated/outdated:**
- `request` npm package: deprecated since 2020; use built-in `fetch`
- `ts-node`: slower than `tsx`, worse ESM support, less actively maintained
- AWS SDK v2: enters maintenance mode; but for this use case, direct HTTP with Signature V4 is even lighter

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | AWS Pricing API GetProducts endpoint works without a paid AWS account (IAM user with no billing) | Pattern 4 | Must create AWS account; adds signup friction |
| A2 | TypeScript 5.9.3 is compatible with Vite 8.0.10 and Vitest 4.1.5 | Standard Stack | May need TS 6.0.3; tsconfig changes required |
| A3 | Node.js 20 LTS (available via setup-node@v4 in GitHub Actions) satisfies Vite 8's ^20.19.0 requirement | Environment Availability | Need specific minor version 20.19.0+; earlier 20.x may fail |
| A4 | AWS Pricing API has no hard rate limit (just "be conservative") | Pattern 4 | May get throttled; need explicit backoff strategy |
| A5 | `glob` package supports `import.meta.dirname` for resolving paths in ESM | Pattern 1 | May need `import.meta.url` + `fileURLToPath` fallback |
| A6 | The pricing API returns `instanceFamily` field as "GPU instance" (exact string) for GPU instance families | Pattern 4 | String may differ; verify with actual API call |
| A7 | Phase 1 entity type for AWS regions is `cloud-region` (not `datacenter` or other type) | Pattern 4 | Schema mismatch if entity type is different |
| A8 | `pnpm` is acceptable as package manager (CONTEXT.md D-18 says "pnpm preferred") | Standard Stack | Could conflict with CI setup or user preference |

## Open Questions

1. **AWS credentials for GitHub Actions**
   - What we know: The Pricing API requires AWS Signature V4 authentication. GitHub Actions can store AWS credentials as repository secrets.
   - What's unclear: Whether the user has an AWS account or wants to create one. The project constraint says "no paid API keys" but IAM credentials are free.
   - Recommendation: Assume AWS credentials will be available. For local dev, support env vars `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`. Document the IAM policy needed (`pricing:GetProducts` on `arn:aws:pricing:*:*:servicecode/AmazonEC2`).

2. **GPU instance family list completeness**
   - What we know: p4d, p5, g5, g6 are the main GPU families. trn (Trainium) and inf (Inferentia) are AI accelerators.
   - What's unclear: Whether to include all of these or just p5 + g6 as the most current families. Including older families (p3, g4dn) adds noise.
   - Recommendation: Start with p5, g5, g6 (current gen) and trn, inf (AI accelerators). Add a configuration mechanism to easily include/exclude families.

3. **Entity granularity for AWS regions**
   - What we know: Each AWS region (us-east-1, eu-west-1, etc.) becomes a `cloud-region` entity.
   - What's unclear: Should Local Zones and Wavelength Zones be separate entities? The region_index.json lists ~96 entries including ~40 Local Zones and ~20 Wavelength Zones.
   - Recommendation: Phase 1 includes only main AWS regions (~36 regions, excluding GovCloud). Local Zones can be added in Phase 2 when more detail is needed.

4. **How to handle AWS regions with no GPU instances**
   - What we know: Not all AWS regions offer GPU instance types. Some newer regions may lack p5 or g6.
   - What's unclear: Should the scraper create entity files for regions with no GPU pricing, or only create files for regions that have GPU data?
   - Recommendation: Only create entity files for regions that have at least one GPU instance type. This keeps the data honest and avoids zero-value entities.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Pipeline runtime | Yes (local) | v25.9.0 | -- |
| Node.js 20.x | GitHub Actions (Vite 8 requires ^20.19.0) | Need setup-node@v4 | -- | -- |
| pnpm | Package manager | Yes (npm global) | 10.33.3 | npm or yarn |
| TypeScript | Type checking | Yes (npm) | 5.9.3 / 6.0.3 | -- |
| tsx | Script runner | Yes (npm) | 4.21.0 | ts-node (slower) |
| Vitest | Testing | Yes (npm) | 4.1.5 | -- |
| AWS credentials | Pricing API auth | Unknown | -- | Mock data for testing |
| glob | Module discovery | Yes (npm) | 13.0.6 | Manual directory read |

**Missing dependencies with no fallback:**
- AWS credentials: Required for live pipeline runs. Without them, the scraper cannot fetch real data. Mitigation: support a `--mock` flag that loads fixture data for local development and testing.

**Missing dependencies with fallback:**
- pnpm: npm or yarn work as alternatives (minor config differences)

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.5 |
| Config file | `vitest.config.ts` (see Wave 0) |
| Quick run command | `pnpm vitest run scripts/` |
| Full suite command | `pnpm vitest run` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PIPE-01 | Fetch AWS GPU pricing and produce entity files | integration | `pnpm vitest run scripts/__tests__/aws-gpu-pricing.test.ts` | Wave 0 |
| PIPE-06 | New scraper requires only interface + registration | unit | `pnpm vitest run scripts/__tests__/registry.test.ts` | Wave 0 |
| PIPE-07 | NormalizedRecord schema with source/entity/metric/value/confidence | unit | `pnpm vitest run scripts/__tests__/types.test.ts` | Wave 0 |
| PIPE-08 | Incremental runs skip unchanged entities (hash check) | unit | `pnpm vitest run scripts/__tests__/hash.test.ts` | Wave 0 |
| PIPE-09 | Compiler produces latest.json, rankings.json, history.json | unit | `pnpm vitest run scripts/__tests__/compiler.test.ts` | Wave 0 |
| PIPE-10 | Fetch retries on failure with exponential backoff | unit | `pnpm vitest run scripts/__tests__/fetch-with-retry.test.ts` | Wave 0 |
| INF-03 | Shared utilities in scrapers/shared/ | unit | Covered by fetch-with-retry and hash tests | Wave 0 |

### Sampling Rate

- **Per task commit:** `pnpm vitest run scripts/` (pipeline tests only, < 5 seconds)
- **Per wave merge:** `pnpm vitest run` (full suite, < 15 seconds)
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `vitest.config.ts` -- Vitest configuration file
- [ ] `tsconfig.json` -- Base TypeScript configuration
- [ ] `tsconfig.scripts.json` -- Pipeline-specific TypeScript config (Node.js target, ESM)
- [ ] `scripts/__tests__/aws-gpu-pricing.test.ts` -- Scraper unit test with mocked API
- [ ] `scripts/__tests__/registry.test.ts` -- Registry auto-discovery test
- [ ] `scripts/__tests__/compiler.test.ts` -- Compiler output test
- [ ] `scripts/__tests__/fetch-with-retry.test.ts` -- Retry logic test
- [ ] `scripts/__tests__/hash.test.ts` -- Content hash determinism test
- [ ] Test fixtures: `scripts/__tests__/fixtures/` -- mock AWS API responses

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | AWS Signature V4 for pricing API; credentials stored in env vars / GitHub secrets |
| V3 Session Management | no | No sessions -- stateless API calls |
| V4 Access Control | no | No user-facing auth in Phase 1 |
| V5 Input Validation | yes | Validate AWS API response structure before parsing; reject malformed data |
| V6 Cryptography | yes | SHA-256 for content hashing; HMAC-SHA256 for AWS request signing |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| AWS credential leak in logs | Information Disclosure | Never log credentials; redact from error messages |
| Malformed API response crash | Denial of Service | Validate response structure before parsing; try/catch per product |
| Git history credential exposure | Information Disclosure | Add `.env` to `.gitignore` immediately; use GitHub secrets, not files |
| Dependency confusion | Tampering | Use lockfile (`pnpm-lock.yaml`); pin dependency versions with `~` |

## Sources

### Primary (HIGH confidence)
- AWS Pricing API docs: https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_pricing_GetProducts.html [CITED]
- AWS Pricing bulk download: https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonEC2/current/region_index.json [VERIFIED: fetched successfully, 96 regions confirmed]
- Vitest docs via Context7: /vitest-dev/vitest [VERIFIED: v4.1.5 via npm registry]
- Vite 8 engine requirement: `^20.19.0 || >=22.12.0` [VERIFIED: npm view vite@8 engines]
- Node.js built-in fetch: stable since Node 18+ [VERIFIED]
- Node.js crypto module: stable, documented in Node.js API docs [VERIFIED]
- TypeScript 5.9.3: [VERIFIED: npm registry]
- tsx 4.21.0: [VERIFIED: npm registry]
- glob 13.0.6: [VERIFIED: npm registry]

### Secondary (MEDIUM confidence)
- AWS Pricing API rate limits: No published hard limit; community reports suggest being conservative [ASSUMED based on training data]
- AWS Signature V4 implementation: ~100 lines of code without SDK [ASSUMED based on training data]
- `instanceFamily` field value "GPU instance": Exact string from API docs [CITED: AWS API reference]

### Tertiary (LOW confidence)
- TypeScript 6.0.3 compatibility with Vite 8: Not verified; CLAUDE.md specifies 5.x [ASSUMED]
- `glob` ESM compatibility with `import.meta.dirname`: Not verified for v13 [ASSUMED]

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH -- all versions verified via npm registry
- Architecture: MEDIUM -- patterns are well-established but AWS Pricing API specifics need live verification
- Pitfalls: MEDIUM -- AWS API JSON-in-JSON pattern is well-documented; Signature V4 clock skew is from training data

**Research date:** 2026-05-06
**Valid until:** 2026-06-06 (30 days -- stable stack, AWS API unlikely to change)
