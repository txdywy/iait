# Phase 1: Pipeline Skeleton - Pattern Map

**Mapped:** 2026-05-06
**Files analyzed:** 23
**Analogs found:** 0 real codebase analogs (greenfield) / 6 RESEARCH.md patterns used as implementation guides

## Classification

All source files are greenfield. No existing code exists in the repository. The "Closest Analog" column references the RESEARCH.md pattern that provides the concrete implementation template. The RESEARCH.md patterns are verified code examples, not abstract guidelines -- they can be adapted directly.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog (RESEARCH.md Pattern) | Match Quality |
|-------------------|------|-----------|--------------------------------------|---------------|
| `package.json` | config | -- | Standard Stack section | exact |
| `tsconfig.json` | config | -- | (no analog -- standard TS config) | -- |
| `tsconfig.scripts.json` | config | -- | Architecture section (NodeNext target) | exact |
| `vitest.config.ts` | config | -- | Code Examples: Vitest config | exact |
| `.gitignore` | config | -- | (no analog -- standard Node gitignore) | -- |
| `scripts/types.ts` | model | -- | Pattern 1: Scraper Interface | exact |
| `scripts/fetch-with-retry.ts` | utility | request-response | Pattern 3: HTTP Fetch with Retry | exact |
| `scripts/hash.ts` | utility | transform | Pattern 2: Incremental Update via Hashing | exact |
| `scripts/registry.ts` | service | event-driven | Pattern 1: Scraper Interface + Self-Registration | exact |
| `scripts/scrapers/aws-gpu-pricing.ts` | service | request-response | Pattern 4: AWS GPU Pricing Scraper | exact |
| `scripts/scrapers/aws-signature-v4.ts` | utility | request-response | Pattern 4 (AWS Signature V4 section) | partial |
| `scripts/compiler.ts` | service | batch | Pattern 5: Data Compiler | exact |
| `scripts/run-pipeline.ts` | controller | batch | Pattern 6: Pipeline Orchestration | exact |
| `scripts/__tests__/types.test.ts` | test | -- | (no analog -- test NormalizedRecord schema) | -- |
| `scripts/__tests__/hash.test.ts` | test | -- | Code Examples: Content Hash Test | exact |
| `scripts/__tests__/fetch-with-retry.test.ts` | test | -- | (no analog -- test retry logic) | -- |
| `scripts/__tests__/registry.test.ts` | test | -- | (no analog -- test auto-discovery) | -- |
| `scripts/__tests__/aws-gpu-pricing.test.ts` | test | -- | Code Examples: Testing a Scraper | exact |
| `scripts/__tests__/compiler.test.ts` | test | -- | (no analog -- test compiler output) | -- |
| `scripts/__tests__/fixtures/aws-api-response.json` | test | -- | Code Examples: mockResponse in scraper test | exact |
| `public/data/entities/country/.gitkeep` | config | -- | (no analog) | -- |
| `public/data/entities/city/.gitkeep` | config | -- | (no analog) | -- |
| `public/data/entities/cloud-region/.gitkeep` | config | -- | (no analog) | -- |
| `public/data/entities/company/.gitkeep` | config | -- | (no analog) | -- |

## Pattern Assignments

### `package.json` (config)

**Analog:** RESEARCH.md Standard Stack section (lines 31-69)

**Installation commands (from research, lines 66-69):**
```bash
pnpm init
pnpm add -D typescript@~5.9.3 tsx@~4.21.0 vitest@~4.1.5 glob@~13.0.6
pnpm add -D @types/node@20
```

**Key decisions:**
- `"type": "module"` -- ESM throughout (State of the Art section, line 870)
- `"engines": { "node": "^20.19.0" }` -- Vite 8 requires this minimum
- `"scripts.pipeline": "tsx scripts/run-pipeline.ts"` -- tsx as script runner
- Only one runtime dependency: `glob@~13.0.6` for scraper auto-discovery

---

### `tsconfig.json` (config)

**Analog:** No direct analog. Standard base config.

**Key settings:**
- `"strict": true`
- `"target": "ES2022"` -- Node 20 supports ES2022 fully
- `"module": "NodeNext"` -- ESM with Node.js resolution
- `"moduleResolution": "NodeNext"`
- `"esModuleInterop": true`
- `"skipLibCheck": true`
- `"include": ["scripts/**/*.ts", "src/**/*.ts", "src/**/*.tsx"]`
- `"exclude": ["node_modules", "dist"]`

---

### `tsconfig.scripts.json` (config)

**Analog:** RESEARCH.md Architecture section (line 179) -- "scripts/ has its own tsconfig.scripts.json targeting NodeNext module resolution"

**Key settings:**
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "dist/scripts"
  },
  "include": ["scripts/**/*.ts"]
}
```

---

### `vitest.config.ts` (config)

**Analog:** RESEARCH.md Code Examples, lines 745-759 (Vitest Configuration for Pipeline Scripts)

**Concrete excerpt:**
```typescript
// vitest.config.ts
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

---

### `scripts/types.ts` (model, --)

**Analog:** RESEARCH.md Pattern 1, lines 189-231 (Scraper Interface + Self-Registration)

**Complete implementation (lines 191-231):**
```typescript
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

**Additional types to add (extracted from other patterns):**
```typescript
// From Pattern 2 (hash.ts) and Pattern 6 (run-pipeline.ts)
export interface EntityFile {
  id: string;
  latest: NormalizedRecord;
  series: NormalizedRecord[];
  _hash: string;
  _updatedAt: string;
}

// From Pattern 6 (run-pipeline.ts), lines 552-555
export interface PipelineMeta {
  lastRun: string;
  entities: Record<string, { hash: string; updatedAt: string }>;
}

// From Pattern 5 (compiler.ts), lines 486-492
export interface CompiledEntity {
  type: EntityType;
  name: string;
  score: number;
  factors: Record<string, number>;
  confidence: number;
  lastUpdated: string;
}
```

---

### `scripts/fetch-with-retry.ts` (utility, request-response)

**Analog:** RESEARCH.md Pattern 3, lines 327-378 (HTTP Fetch with Retry and Exponential Backoff)

**Complete implementation (lines 328-377):**
```typescript
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

**Error handling:** Throws on non-retryable HTTP errors (4xx except 429). Retries on 429 and 5xx with exponential backoff + jitter. Aborts on timeout via `AbortController`.

---

### `scripts/hash.ts` (utility, transform)

**Analog:** RESEARCH.md Pattern 2, lines 273-283 (Incremental Update via Content Hashing)

**Complete implementation (lines 274-283):**
```typescript
import { createHash } from 'node:crypto';
import type { NormalizedRecord } from './types.js';

export function hashRecords(records: NormalizedRecord[]): string {
  // Sort records by timestamp for deterministic hashing
  const sorted = [...records].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const payload = JSON.stringify(sorted);
  return createHash('sha256').update(payload).digest('hex');
}
```

**Key pitfall (Pitfall 5, lines 676-689):** Hash the *normalized records array*, not the final entity file JSON. The entity file includes `_hash` and `_updatedAt` which change every run.

---

### `scripts/registry.ts` (service, event-driven)

**Analog:** RESEARCH.md Pattern 1, lines 233-262 (Scraper Interface + Self-Registration)

**Complete implementation (lines 234-261):**
```typescript
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

**Anti-pattern (lines 608):** Never hardcode scraper paths. The whole point of the registry is zero-touch extension.

**Pitfall (A5 assumption):** `import.meta.dirname` may not work with `glob` in all ESM contexts. Fallback: `path.dirname(fileURLToPath(import.meta.url))`.

---

### `scripts/scrapers/aws-gpu-pricing.ts` (service, request-response)

**Analog:** RESEARCH.md Pattern 4, lines 407-461 (AWS GPU Pricing Scraper)

**Core implementation (lines 409-460):**
```typescript
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

**AWS API call pattern (Code Examples, lines 697-739):**
```typescript
const PRICING_ENDPOINT = 'https://pricing.us-east-1.amazonaws.com';

async function getProducts(family: string): Promise<PricingProduct[]> {
  const params = new URLSearchParams({
    ServiceCode: 'AmazonEC2',
    FormatVersion: 'aws_v1',
  });

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

  if (data.NextToken) {
    // Handle pagination
  }

  return products;
}
```

**Critical pitfall (Pitfall 1, lines 626-638):** AWS PriceList contains JSON strings, not objects. Must `JSON.parse()` each item individually.

---

### `scripts/scrapers/aws-signature-v4.ts` (utility, request-response)

**Analog:** RESEARCH.md Pattern 4 section (lines 463-469) -- description only, no full code

**What to build (~100 lines):**
1. Create canonical request (method, URI, query string, headers, payload hash)
2. Create string to sign (algorithm, timestamp, credential scope, canonical request hash)
3. Calculate signature using HMAC-SHA256 via `node:crypto`
4. Return `Authorization` header

**No full code example in RESEARCH.md.** Planner should implement based on AWS Signature V4 spec. Key imports:
```typescript
import { createHmac, createHash } from 'node:crypto';
```

**Security note (Security Domain, lines 976-979):** Never log AWS credentials. Redact from error messages.

---

### `scripts/compiler.ts` (service, batch)

**Analog:** RESEARCH.md Pattern 5, lines 479-533 (Data Compiler)

**Complete implementation (lines 480-532):**
```typescript
import fs from 'node:fs/promises';
import path from 'node:path';
import { EntityType } from './types.js';

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

**Output schemas (CONTEXT.md D-13 to D-15):**
- `latest.json`: `{ generated, entities: { [id]: { type, name, score, factors, confidence, lastUpdated } } }`
- `rankings.json`: `{ generated, byType: { countries: [...], cities: [...], cloudRegions: [...], companies: [...] } }`
- `history.json`: `{ [entityId]: { type, name, series: [{ timestamp, score, factors }] } }`

---

### `scripts/run-pipeline.ts` (controller, batch)

**Analog:** RESEARCH.md Pattern 6, lines 543-601 (Pipeline Orchestration Entry Point)

**Complete implementation (lines 544-601):**
```typescript
import { discoverScrapers, getScrapers } from './registry.js';
import { hashRecords } from './hash.js';
import { compile } from './compiler.js';
import fs from 'node:fs/promises';
import path from 'node:path';

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

**writeEntityIfChanged function (Pattern 2, lines 289-315):**
```typescript
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

---

### Test Files

#### `scripts/__tests__/hash.test.ts` (test)

**Analog:** RESEARCH.md Code Examples, lines 830-859 (Content Hash Test)

**Complete implementation (lines 832-858):**
```typescript
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

#### `scripts/__tests__/aws-gpu-pricing.test.ts` (test)

**Analog:** RESEARCH.md Code Examples, lines 765-826 (Testing a Scraper with Mock Network Calls)

**Core pattern (lines 768-825):**
```typescript
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
      entity: { type: 'cloud-region' },
      metric: 'gpu-price-hr',
      unit: 'USD/hr',
      confidence: 5,
    });
  });
});
```

**Testing pattern:** Use `vi.stubGlobal('fetch', vi.fn())` to mock the global `fetch`. The mock response must include `PriceList` as JSON strings (array of `JSON.stringify()`'d objects), matching the actual AWS API response format.

#### `scripts/__tests__/fixtures/aws-api-response.json` (test fixture)

**Analog:** The `mockResponse` object from the scraper test above. Extract to a static fixture file so multiple tests can reuse it.

**Structure:**
```json
{
  "FormatVersion": "aws_v1",
  "PriceList": [
    "{...JSON string of product + terms...}"
  ],
  "NextToken": null
}
```

#### Other test files (`types.test.ts`, `fetch-with-retry.test.ts`, `registry.test.ts`, `compiler.test.ts`)

**No direct analogs.** Use the same Vitest patterns as the hash and scraper tests:
- `describe/it/expect` structure
- `vi.fn()` and `vi.mock()` for mocking
- `vi.stubGlobal('fetch', vi.fn())` for HTTP mocking
- `beforeEach(() => { vi.restoreAllMocks() })` for cleanup

---

### `.gitignore` (config)

**No analog.** Standard Node.js + project-specific entries:
```
node_modules/
dist/
data/raw/
.env
*.local
```

Note: `data/raw/` is gitignored (Anti-Patterns section, line 609). `public/data/` is NOT gitignored -- it gets committed.

---

### Directory scaffolding (`.gitkeep` files)

**No analog.** Create empty `.gitkeep` files in:
- `public/data/entities/country/.gitkeep`
- `public/data/entities/city/.gitkeep`
- `public/data/entities/cloud-region/.gitkeep`
- `public/data/entities/company/.gitkeep`

Per CONTEXT.md D-04: "For Phase 1, only cloud-region/ entities will have data. Other entity types will be empty directories with a .gitkeep."

---

## Shared Patterns

### ESM Import Convention
**Source:** All RESEARCH.md patterns use `.js` extensions in imports
**Apply to:** All `scripts/` files
```typescript
import type { Scraper } from './types.js';
import { fetchWithRetry } from './fetch-with-retry.js';
```
All imports between scripts MUST use `.js` extension per NodeNext module resolution.

### Console Logging Convention
**Source:** RESEARCH.md patterns (registry, pipeline, fetch-with-retry)
**Apply to:** All scripts
```typescript
console.log('[registry] Registered scraper: ...');
console.log('[pipeline] Starting...');
console.warn(`[retry] ${response.status} on ${url}...`);
console.log(`[skip] ${entityId} unchanged (hash match)`);
```
Pattern: `[module-name]` prefix for all log messages. Use `console.log` for info, `console.warn` for retries, `console.error` for fatal errors.

### Error Handling
**Source:** RESEARCH.md Pattern 6 (run-pipeline.ts), lines 598-601
**Apply to:** Entry point
```typescript
run().catch(err => {
  console.error('[pipeline] Fatal error:', err);
  process.exit(1);
});
```
Pattern: Top-level catch-all at entry point. Individual scrapers should throw on unrecoverable errors (the pipeline orchestrator does not catch per-scraper errors -- a scraper failure halts the pipeline).

### AWS Credential Handling
**Source:** RESEARCH.md Security Domain, lines 976-979 and Open Question 1
**Apply to:** `aws-signature-v4.ts`, `aws-gpu-pricing.ts`
```typescript
const awsCredentials = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
};
```
Read from environment variables. Never log credentials. Never commit `.env` files.

### Testing Mock Pattern
**Source:** RESEARCH.md Code Examples (scraper test and hash test)
**Apply to:** All test files
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());  // for HTTP tests
  // or
  vi.restoreAllMocks();             // general cleanup
});
```

---

## No Analog Found

Files that have no close match even in RESEARCH.md (planner should design from requirements):

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `scripts/scrapers/aws-signature-v4.ts` | utility | request-response | RESEARCH.md describes it (~100 lines) but provides no code. Must implement AWS Signature V4 spec from scratch. |
| `scripts/__tests__/types.test.ts` | test | -- | No test example for interface/enum validation. Simple test that NormalizedRecord type satisfies shape. |
| `scripts/__tests__/fetch-with-retry.test.ts` | test | -- | No test example. Must mock fetch with sequential responses (fail, fail, succeed). |
| `scripts/__tests__/registry.test.ts` | test | -- | No test example. Must mock `glob` to return test scraper files. |
| `scripts/__tests__/compiler.test.ts` | test | -- | No test example. Must create temp entity files, run compiler, verify output schemas. |
| `tsconfig.json` | config | -- | Standard config, no pattern needed. |
| `.gitignore` | config | -- | Standard config, no pattern needed. |

## Metadata

**Analog search scope:** No codebase search performed (greenfield project, zero source files)
**Files scanned:** 0 (no source code exists)
**Pattern extraction source:** RESEARCH.md (1000 lines of verified code examples and architectural patterns)
**Pattern extraction date:** 2026-05-06
