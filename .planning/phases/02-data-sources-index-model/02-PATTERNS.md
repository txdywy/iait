# Phase 2: Data Sources + Index Model - Pattern Map

**Mapped:** 2026-05-06
**Files analyzed:** 20 (4 new scrapers + index model + 4 JSON configs + 5 test files + 4 fixtures + 3 modified source files)
**Analogs found:** 8 / 20 (all have close codebase analogs from Phase 1)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `scripts/scrapers/azure-gpu-pricing.ts` | service/scraper | request-response | `scripts/scrapers/aws-gpu-pricing.ts` | exact |
| `scripts/scrapers/owid-energy.ts` | service/scraper | transform (CSV->records) | `scripts/scrapers/aws-gpu-pricing.ts` | role-match |
| `scripts/scrapers/world-bank-energy.ts` | service/scraper | request-response | `scripts/scrapers/aws-gpu-pricing.ts` | exact |
| `scripts/scrapers/sec-edgar-capex.ts` | service/scraper | request-response | `scripts/scrapers/aws-gpu-pricing.ts` | role-match |
| `scripts/index-model.ts` | service/model | batch transform | `scripts/compiler.ts` | role-match |
| `scripts/compiler.ts` (modify) | service | batch | self (existing) | exact |
| `scripts/run-pipeline.ts` (modify) | controller | batch | self (existing) | exact |
| `scripts/types.ts` (modify) | model | -- | self (existing) | exact |
| `scripts/mappings/entity-crossref.json` | config | -- | no analog | -- |
| `scripts/mappings/export-control-tiers.json` | config | -- | no analog | -- |
| `public/data/index-config.json` | config | -- | no analog | -- |
| `scripts/__tests__/azure-gpu-pricing.test.ts` | test | -- | `scripts/__tests__/aws-gpu-pricing.test.ts` | exact |
| `scripts/__tests__/owid-energy.test.ts` | test | -- | `scripts/__tests__/aws-gpu-pricing.test.ts` | role-match |
| `scripts/__tests__/world-bank-energy.test.ts` | test | -- | `scripts/__tests__/aws-gpu-pricing.test.ts` | exact |
| `scripts/__tests__/sec-edgar-capex.test.ts` | test | -- | `scripts/__tests__/aws-gpu-pricing.test.ts` | role-match |
| `scripts/__tests__/index-model.test.ts` | test | -- | `scripts/__tests__/compiler.test.ts` | role-match |
| `scripts/__tests__/fixtures/azure-api-response.json` | test fixture | -- | `scripts/__tests__/fixtures/aws-api-response.json` | exact |
| `scripts/__tests__/fixtures/owid-energy-sample.csv` | test fixture | -- | no analog (CSV) | -- |
| `scripts/__tests__/fixtures/world-bank-response.json` | test fixture | -- | `scripts/__tests__/fixtures/aws-api-response.json` | exact |
| `scripts/__tests__/fixtures/sec-edgar-companyfacts.json` | test fixture | -- | `scripts/__tests__/fixtures/aws-api-response.json` | role-match |

## Pattern Assignments

### `scripts/scrapers/azure-gpu-pricing.ts` (service/scraper, request-response)

**Analog:** `scripts/scrapers/aws-gpu-pricing.ts` (lines 1-172)

**Imports pattern** (analog lines 1-4):
```typescript
import type { Scraper, NormalizedRecord } from '../types.js';
import { DataSourceLayer, EntityType } from '../types.js';
import { fetchWithRetry } from '../fetch-with-retry.js';
```

**Class structure** (analog lines 49-65):
```typescript
class AzureGpuPricingScraper implements Scraper {
  readonly name = 'azure-gpu-pricing';
  readonly source = DataSourceLayer.STRUCTURED_API;

  async fetch(): Promise<NormalizedRecord[]> {
    const records: NormalizedRecord[] = [];
    // ... fetch all GPU families/pages
    return records;
  }
}
export default new AzureGpuPricingScraper();
```

**Pagination pattern** (analog lines 67-127, do-while with NextToken):
Azure uses `NextPageLink` (full URL) instead of `NextToken`. Same do-while loop pattern:
```typescript
do {
  const response = await fetchWithRetry(nextPageUrl);
  const data = await response.json();
  // ... process items
  nextPageUrl = data.NextPageLink ?? null;
} while (nextPageUrl);
```

**Normalize pattern** (analog lines 129-152):
```typescript
private normalize(item: AzurePriceItem): NormalizedRecord | null {
  // Map armRegionName to entity ID: `azure-${armRegionName}`
  // Filter to GPU families (NC, ND, NV)
  // Extract retailPrice as value
  return {
    source: this.name,
    entity: { id: `azure-${item.armRegionName}`, type: EntityType.CLOUD_REGION, name: item.location },
    metric: 'gpu-price-hr',
    value: item.retailPrice,
    unit: 'USD/hr',
    timestamp: new Date().toISOString(),
    confidence: 5,  // structured_api per D-07
  };
}
```

**Key difference from AWS scraper:** No authentication (no Sig V4). Simpler JSON response (not stringified PriceList). OData filtering via query params instead of POST body. Rate limit: 100ms inter-page delay via `fetchWithRetry`'s `baseDelayMs` parameter.

---

### `scripts/scrapers/owid-energy.ts` (service/scraper, transform/CSV)

**Analog:** `scripts/scrapers/aws-gpu-pricing.ts` (lines 1-172, structural skeleton only)

**Imports pattern** (same as all scrapers):
```typescript
import type { Scraper, NormalizedRecord } from '../types.js';
import { DataSourceLayer, EntityType } from '../types.js';
import { fetchWithRetry } from '../fetch-with-retry.js';
```

**Class structure** (analog lines 49-65, identical skeleton):
```typescript
class OwidEnergyScraper implements Scraper {
  readonly name = 'owid-energy';
  readonly source = DataSourceLayer.STRUCTURED_API;

  async fetch(): Promise<NormalizedRecord[]> {
    const response = await fetchWithRetry('https://raw.githubusercontent.com/owid/energy-data/master/owid-energy-data.csv');
    const csv = await response.text();
    return this.parseCsv(csv);
  }
}
export default new OwidEnergyScraper();
```

**CSV parsing pattern** (new -- no direct analog):
```typescript
private parseCsv(csv: string): NormalizedRecord[] {
  const lines = csv.split('\n');
  const headers = lines[0].split(',');
  // Build header->index map
  // Filter rows for MVP country names (D-06: 10 countries)
  // For each country: take max year row
  // Extract: primary_energy_consumption, electricity_generation, renewables_share_elec
  // Normalize each to a NormalizedRecord with EntityType.COUNTRY
}
```

**Country name mapping:** Use hardcoded lookup table (MVP has 10 countries, manual mapping per D-04):
```typescript
const OWID_TO_ISO: Record<string, string> = {
  'United States': 'us',
  'China': 'cn',
  'Germany': 'de',
  // ... etc
};
```

**Key difference from AWS scraper:** Single HTTP GET (no pagination). CSV parsing instead of JSON. Entity type is `COUNTRY` not `CLOUD_REGION`. Multiple metrics per country (energy_consumption, electricity_generation, renewables_share). Each metric produces a separate `NormalizedRecord`.

---

### `scripts/scrapers/world-bank-energy.ts` (service/scraper, request-response)

**Analog:** `scripts/scrapers/aws-gpu-pricing.ts` (lines 1-172, exact structural match)

**Imports pattern** (identical to all scrapers):
```typescript
import type { Scraper, NormalizedRecord } from '../types.js';
import { DataSourceLayer, EntityType } from '../types.js';
import { fetchWithRetry } from '../fetch-with-retry.js';
```

**Class structure** (analog lines 49-65):
```typescript
class WorldBankEnergyScraper implements Scraper {
  readonly name = 'world-bank-energy';
  readonly source = DataSourceLayer.STRUCTURED_API;

  async fetch(): Promise<NormalizedRecord[]> {
    const records: NormalizedRecord[] = [];
    // Two API calls: one per indicator
    for (const indicator of INDICATORS) {
      const data = await this.fetchIndicator(indicator);
      records.push(...data);
    }
    return records;
  }
}
export default new WorldBankEnergyScraper();
```

**API call pattern** (analog fetchFamily lines 67-127, simplified -- no pagination needed):
```typescript
private async fetchIndicator(indicator: string): Promise<NormalizedRecord[]> {
  const codes = 'USA;CHN;DEU;GBR;JPN;IND;SGP;NLD;IRL;CAN';
  const url = `https://api.worldbank.org/v2/country/${codes}/indicator/${indicator}?format=json&per_page=1000&mrnev=1`;
  const response = await fetchWithRetry(url);
  const [metadata, data] = await response.json() as [object, WorldBankItem[]];
  // ... normalize each item
}
```

**Response parsing** (World Bank returns `[metadata, data_array]` -- index 0 is metadata, index 1 is data):
```typescript
// data[i].countryiso3code -> entity ID via crossref
// data[i].value -> metric value (can be null)
// data[i].date -> year as string -> timestamp
```

**Key difference from AWS scraper:** Response is a 2-element array. Multi-country batch request. Country mapping via ISO-3 codes. `value` can be `null` (skip those). Only 2 API calls total (one per indicator).

---

### `scripts/scrapers/sec-edgar-capex.ts` (service/scraper, request-response)

**Analog:** `scripts/scrapers/aws-gpu-pricing.ts` (lines 1-172, structural skeleton)

**Imports pattern** (identical to all scrapers):
```typescript
import type { Scraper, NormalizedRecord } from '../types.js';
import { DataSourceLayer, EntityType } from '../types.js';
import { fetchWithRetry } from '../fetch-with-retry.js';
```

**Class structure** (analog lines 49-65):
```typescript
class SecEdgarCapexScraper implements Scraper {
  readonly name = 'sec-edgar-capex';
  readonly source = DataSourceLayer.STRUCTURED_API;

  async fetch(): Promise<NormalizedRecord[]> {
    const records: NormalizedRecord[] = [];
    for (const company of COMPANIES) {
      const data = await this.fetchCompany(company);
      records.push(...data);
    }
    return records;
  }
}
export default new SecEdgarCapexScraper();
```

**SEC-specific headers** (new pattern -- User-Agent required per D-12):
```typescript
private getHeaders(): Record<string, string> {
  const email = process.env.SEC_EDGAR_EMAIL ?? 'contact@example.com';
  return { 'User-Agent': `ComputeAtlas/0.1.0 (${email})` };
}

private async fetchCompany(company: CompanyEntry): Promise<NormalizedRecord[]> {
  const url = `https://data.sec.gov/api/xbrl/companyconcept/CIK${company.cik}/us-gaap/PaymentsToAcquirePropertyPlantAndEquipment.json`;
  const response = await fetchWithRetry(url, { headers: this.getHeaders() });
  // ...
}
```

**TTM calculation** (new pattern -- sum last 4 quarters):
```typescript
private computeTTM(quarters: XBRLFact[]): number {
  // Sort by end date descending, take first 4, sum values
  // Apply Math.abs() to handle sign inconsistencies
  // Return annualized CapEx value
}
```

**Sanity bounds** (new pattern):
```typescript
const MIN_CAPEX = 100_000_000;     // $100M
const MAX_CAPEX = 100_000_000_000;  // $100B
```

**Key difference from AWS scraper:** Custom headers required. Response parsing is more complex (XBRL facts with deduplication, TTM calculation). Rate limit: 10 req/sec (5 companies = 5 calls). Entity type is `COMPANY`. Must handle unit scaling variations across companies.

---

### `scripts/index-model.ts` (service/model, batch transform)

**Analog:** `scripts/compiler.ts` (lines 1-166, structural pattern for pure-computation module)

**Imports pattern** (analog compiler lines 1-4):
```typescript
import type { EntityFile, CompiledEntity, EntityType } from './types.js';
```

**Exported functions** (new module, but follows compiler's pattern of exported async functions):
```typescript
export function computeFactors(entities: Map<string, EntityFile>, crossRef: CrossRef): Map<string, Record<string, number>> { ... }
export function normalizeFactors(factors: Map<string, Record<string, number>>, entityType: EntityType): Map<string, Record<string, number>> { ... }
export function computeCompositeScore(normalized: Record<string, number>, weights: Record<string, number>, riskMultiplier: number): number { ... }
export function computeConfidence(entity: EntityFile, factors: Record<string, number>, weights: Record<string, number>): number { ... }
export function percentileRank(value: number, allValues: number[]): number { ... }
```

**Pure function design** (no I/O, no file reads -- compiler loads data and passes it in):
The index model is a pure computation module. Unlike `compiler.ts` which does I/O (reads entity files, writes JSON), the index model takes inputs and returns outputs. This makes it independently testable.

**Percentile ranking** (core new algorithm):
```typescript
export function percentileRank(value: number, allValues: number[]): number {
  if (allValues.length === 0) return 50; // neutral for single entity
  const count = allValues.filter(v => v <= value).length;
  return (count / allValues.length) * 100;
}
```

---

### `scripts/types.ts` (modify, model)

**Analog:** self (existing file at lines 1-102)

**New types to add** (after line 102):
```typescript
/** Index configuration weights */
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

/** Export control tier definition */
export interface ExportControlTiers {
  version: number;
  tiers: Record<string, { multiplier: number; description: string }>;
  countries: Record<string, string>;
}

/** Entity cross-reference mapping */
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

/** Extended CompiledEntity for Phase 2 (modify existing) */
// Add to existing CompiledEntity interface:
//   riskTier?: string;
//   riskMultiplier?: number;
//   factorBreakdown?: Record<string, { raw: number; normalized: number; weight: number }>;
//   dataCompleteness?: 'full' | 'partial';
```

**Extend CompiledEntity** (modify existing interface at lines 89-102):
Add optional fields: `riskTier`, `riskMultiplier`, `factorBreakdown`, `dataCompleteness`. Backward-compatible because they are optional.

---

### `scripts/compiler.ts` (modify, service/batch)

**Analog:** self (existing file at lines 1-166)

**Core changes:**
1. `loadAllEntities()` (line 35) -- no change needed, already loads all entity files
2. `writeLatest()` (lines 66-88) -- change `score: entity.latest.value` to use composite index score from index-model
3. `writeRankings()` (lines 100-131) -- change `score: entity.latest.value` to composite score
4. `writeHistory()` (lines 136-156) -- change `score: record.value` to composite score per time point

**New step in compile()** (after line 161):
```typescript
export async function compile(dataDir = 'public/data'): Promise<void> {
  const entities = await loadAllEntities(dataDir);
  const config = await loadIndexConfig(dataDir);         // NEW
  const crossRef = await loadCrossRef();                  // NEW
  const riskTiers = await loadExportControlTiers();       // NEW
  const scoredEntities = computeScores(entities, config, crossRef, riskTiers);  // NEW
  await writeLatest(scoredEntities, dataDir);
  await writeRankings(scoredEntities, dataDir);
  await writeHistory(scoredEntities, dataDir);
}
```

**Pattern to follow for new helper functions** (analog `loadAllEntities` lines 35-60):
```typescript
async function loadIndexConfig(dataDir: string): Promise<IndexConfig> {
  const raw = await fs.readFile(path.join(dataDir, 'index-config.json'), 'utf-8');
  return JSON.parse(raw);
}
```

---

### `scripts/run-pipeline.ts` (modify, controller/batch)

**Analog:** self (existing file at lines 1-102)

**CR-01 fix** (insert after line 87, before `await compile()`):
```typescript
if (written === 0 && Object.keys(meta.entities).length === 0) {
  console.warn('[pipeline] No data produced and no existing entities. Skipping compile.');
  return;
}
```

**CR-02 fix** (modify `writeEntityIfChanged` at line 52):
```typescript
const sortedByTime = [...records].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
const entityFile: EntityFile = {
  id: entityId,
  type: entityType,
  latest: sortedByTime[sortedByTime.length - 1],
  series: sortedByTime,
  _hash: newHash,
  _updatedAt: new Date().toISOString(),
};
```

**Multi-source entity merging** (new step after scraper loop, before compile):
```typescript
// After all scrapers run, merge records by entity ID
const allRecords = new Map<string, NormalizedRecord[]>();
for (const scraper of scrapers) {
  const records = await scraper.fetch();  // already collected above
  for (const [entityId, entityRecords] of groupByEntity(records)) {
    const existing = allRecords.get(entityId) ?? [];
    existing.push(...entityRecords);
    allRecords.set(entityId, existing);
  }
}
// Then write merged entity files
```

---

### Test Files Pattern

**Analog:** `scripts/__tests__/aws-gpu-pricing.test.ts` (lines 1-56)

**All new scraper tests follow this structure:**
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';

const fixturePath = path.resolve(import.meta.dirname, 'fixtures/<fixture-name>');
const fixture = JSON.parse(await fs.readFile(fixturePath, 'utf-8'));

describe('<ScraperName>', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('normalizes records to NormalizedRecord format', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(fixture),  // or .text() for CSV
    } as Response);

    const { default: scraper } = await import('../scrapers/<scraper-file>.js');
    const records = await scraper.fetch();

    expect(records.length).toBeGreaterThan(0);
    expect(records[0]).toMatchObject({
      source: '<scraper-name>',
      entity: { type: '<entity-type>' },
      metric: '<metric-name>',
      confidence: 5,
    });
  });
});
```

**Key patterns from analog test** (lines 1-56):
- Fixture loaded via `fs.readFile` at module level (top-level await)
- `vi.stubGlobal('fetch', vi.fn())` in `beforeEach`
- Dynamic import of scraper: `const { default: scraper } = await import('../scrapers/<name>.js')`
- `toMatchObject` for partial matching of NormalizedRecord shape
- Test multiple aspects in separate `it` blocks (normalization, parsing, edge cases)

**OWID-specific difference:** Mock `fetch` to return `.text()` (CSV string) instead of `.json()`:
```typescript
vi.mocked(fetch).mockResolvedValue({
  ok: true,
  text: () => Promise.resolve(fixtureCsv),
} as Response);
```

---

## Shared Patterns

### Scraper Default Export
**Source:** `scripts/scrapers/aws-gpu-pricing.ts` line 172
**Apply to:** All 4 new scrapers
```typescript
export default new AzureGpuPricingScraper();
export default new OwidEnergyScraper();
export default new WorldBankEnergyScraper();
export default new SecEdgarCapexScraper();
```
Every scraper must have a `default` export of a class instance. The registry discovers scrapers via `mod.default`.

### Scraper Interface Implementation
**Source:** `scripts/scrapers/aws-gpu-pricing.ts` lines 49-53
**Apply to:** All 4 new scrapers
```typescript
class <Name>Scraper implements Scraper {
  readonly name = '<kebab-case-name>';
  readonly source = DataSourceLayer.STRUCTURED_API;
  async fetch(): Promise<NormalizedRecord[]> { ... }
}
```
`name` must be unique (used as registry key). `source` is `STRUCTURED_API` for all 4 new scrapers (per D-07, confidence = 5).

### fetchWithRetry Usage
**Source:** `scripts/fetch-with-retry.ts` (lines 1-69)
**Apply to:** All scrapers making HTTP calls
```typescript
import { fetchWithRetry } from '../fetch-with-retry.js';

const response = await fetchWithRetry(url, { headers }, { baseDelayMs: 100 });
```
Use `baseDelayMs` parameter for rate limiting (Azure: 100ms). Default retries=3, timeout=30s are appropriate for all new scrapers.

### ESM Import Convention
**Source:** All Phase 1 files
**Apply to:** All new files
```typescript
import type { Scraper } from '../types.js';        // .js extension required
import { fetchWithRetry } from '../fetch-with-retry.js';
```
All imports between scripts MUST use `.js` extension per NodeNext module resolution.

### Console Logging Convention
**Source:** All Phase 1 scripts
**Apply to:** All new files
```typescript
console.log('[azure-gpu-pricing] Fetching GPU prices...');
console.warn('[owid-energy] Missing data for country: ...');
console.error('[sec-edgar-capex] Failed to parse XBRL response');
```
Pattern: `[scraper/module-name]` prefix for all log messages.

### Testing Mock Pattern
**Source:** `scripts/__tests__/aws-gpu-pricing.test.ts` lines 1-11
**Apply to:** All new test files
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});
```
Always use `vi.stubGlobal('fetch', vi.fn())` to mock HTTP. Use `vi.mocked(fetch).mockResolvedValue(...)` to set responses.

### JSON Config File Pattern
**New pattern for Phase 2**
**Apply to:** `entity-crossref.json`, `export-control-tiers.json`, `index-config.json`
All config files include a `version: 1` field for future schema evolution. All are static JSON committed to the repo.

---

## No Analog Found

Files with no close match in the codebase (planner should use RESEARCH.md patterns instead):

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `scripts/__tests__/fixtures/owid-energy-sample.csv` | test fixture | -- | No CSV fixtures in codebase. Build from OWID research data: 5-10 rows, 3 countries, target columns. |
| `scripts/mappings/entity-crossref.json` | config | -- | New concept (cross-source entity mapping). Use structure from RESEARCH.md section 3.5. |
| `scripts/mappings/export-control-tiers.json` | config | -- | New concept. Use structure from RESEARCH.md section 3.4. |
| `public/data/index-config.json` | config | -- | New concept. Use structure from RESEARCH.md section 6.1. |
| `scripts/index-model.ts` | service/model | batch transform | No existing pure-computation module. Design as pure functions (no I/O) per RESEARCH.md section 3. |
| `scripts/__tests__/index-model.test.ts` | test | -- | No pure-function test analog. Use standard Vitest with direct function imports (no HTTP mocking needed). |

## Metadata

**Analog search scope:** `scripts/` directory (all .ts files), `scripts/__tests__/` (all test files and fixtures)
**Files scanned:** 16 (8 source files, 6 test files, 2 fixture files)
**Pattern extraction date:** 2026-05-06
