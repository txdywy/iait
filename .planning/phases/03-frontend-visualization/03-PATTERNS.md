# Phase 03: frontend-visualization - Pattern Map

**Mapped:** 2026-05-07
**Files analyzed:** 28 planned new/modified files or file groups
**Analogs found:** 17 / 28

> Note: `/Users/yiwei/ics/iait/.claude/worktrees/agent-a1a9dd47befd7d1d9/.planning/phases/03-frontend-visualization/03-RESEARCH.md` was not present in this worktree. Pattern mapping used the available research artifact at `/Users/yiwei/ics/iait/.planning/phases/03-frontend-visualization/03-RESEARCH.md` plus the worktree's Phase 3 context.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `package.json` | config | build/config | `package.json` | exact-existing-config |
| `vite.config.ts` | config | build/config | `vitest.config.ts` + RESEARCH Vite example | role-match |
| `index.html` | config | request-response/static-entry | No in-repo analog | no-analog |
| `tsconfig.json` | config | build/config | `tsconfig.json` | exact-existing-config |
| `vitest.config.ts` | config | test/config | `vitest.config.ts` | exact-existing-config |
| `src/main.tsx` | app entry | request-response/static-entry | No in-repo analog; use RESEARCH React examples | no-analog |
| `src/app/App.tsx` | component | request-response | No in-repo analog; use RESEARCH shell pattern | no-analog |
| `src/app/router.tsx` | route | request-response | RESEARCH HashRouter pattern | research-match |
| `src/app/providers.tsx` | provider | request-response/cache | RESEARCH React Query provider pattern | research-match |
| `src/styles/index.css` | config/style | transform | RESEARCH Tailwind CSS 4 pattern | research-match |
| `src/data/types.ts` | model | transform | `scripts/types.ts` | exact-contract |
| `src/data/static-json.ts` | utility | file-I/O/request-response | `scripts/fetch-with-retry.ts` + `scripts/compiler.ts` `loadJsonFile` | role-match |
| `src/data/queries.ts` | hook/service | request-response/cache | RESEARCH React Query pattern + `scripts/compiler.ts` output contract | role-match |
| `src/store/explorer-store.ts` | store | event-driven | RESEARCH Zustand pattern | research-match |
| `src/features/map/ComputeMap.tsx` | component | event-driven/map | RESEARCH MapLibre pattern | research-match/no-in-repo |
| `src/features/map/country-join.ts` | utility | transform | `scripts/compiler.ts` `computeAllScores`/aggregation joins | role-match |
| `src/features/map/drilldown.ts` | utility | event-driven/transform | `scripts/mappings/entity-crossref.json` + `scripts/compiler.ts` type grouping | data-contract-match |
| `src/features/rankings/RankingRail.tsx` | component | CRUD/read-only transform | `scripts/compiler.ts` `writeRankings` | data-flow-match |
| `src/features/details/EntityDetailRoute.tsx` | component/route | request-response/read-only | `scripts/types.ts` + `scripts/compiler.ts` `writeLatest` | data-contract-match |
| `src/features/details/FactorBreakdown.tsx` | component | transform | `scripts/compiler.ts` `buildFactorBreakdown` | exact-data-shape |
| `src/features/trends/TrendChart.tsx` | component | streaming/history transform | RESEARCH ECharts lazy pattern + `scripts/compiler.ts` `writeHistory` | research-match |
| `src/features/trends/trend-options.ts` | utility | transform | `scripts/compiler.ts` `writeHistory` | data-flow-match |
| `src/components/HudPanel.tsx` | component | request-response/render | No in-repo analog; use RESEARCH Tailwind/HUD decisions | no-analog |
| `src/components/StatusBadges.tsx` | component | transform/render | `scripts/types.ts` confidence/completeness fields | data-contract-match |
| `src/components/LoadingState.tsx` | component | request-response/render | No in-repo analog; use RESEARCH React Query states | no-analog |
| `public/data/geo/countries-110m.json` | static asset | file-I/O | `public/data/index-config.json` | role-match-static-asset |
| `src/test/setup.ts` | test config | test/config | `vitest.config.ts` | role-match |
| `src/**/*.test.{ts,tsx}` | test | batch/request-response | `scripts/__tests__/compiler.test.ts` | exact-test-style |

## Pattern Assignments

### `package.json` (config, build/config)

**Analog:** `package.json`

**Existing script/dependency pattern** (lines 1-20):
```json
{
  "name": "computeatlas",
  "version": "0.1.0",
  "type": "module",
  "private": true,
  "engines": {
    "node": "^20.19.0"
  },
  "scripts": {
    "pipeline": "tsx scripts/run-pipeline.ts",
    "test": "vitest run",
    "test:scripts": "vitest run scripts/"
  },
  "devDependencies": {
    "typescript": "~5.9.3",
    "tsx": "~4.21.0",
    "vitest": "~4.1.5",
    "glob": "~13.0.6",
    "@types/node": "^20.0.0"
  }
}
```

**Copy guidance:** Preserve ESM (`"type": "module"`) and Node engine. Add frontend scripts (`dev`, `build`, `preview`, `typecheck`) without removing `pipeline`, `test`, or `test:scripts`.

---

### `vite.config.ts` (config, build/config)

**Analog:** `vitest.config.ts`; supplement with researched Vite/Tailwind pattern.

**Current config style** (lines 1-11):
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['scripts/**/*.test.ts', 'src/**/*.test.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    testTimeout: 10000,
    pool: 'threads',
    clearMocks: true,
    restoreMocks: true,
  },
});
```

**Research Vite pattern to apply** (`03-RESEARCH.md` lines 394-405):
```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: '/iait/',
  plugins: [react(), tailwindcss()],
});
```

**Copy guidance:** Use default `defineConfig` export, no CommonJS. Set `base: '/iait/'` for GitHub Pages.

---

### `tsconfig.json` and frontend TypeScript config (config, build/config)

**Analog:** `tsconfig.json`

**Strict TypeScript pattern** (lines 1-19):
```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "dist",
    "rootDir": ".",
    "lib": ["ES2022"]
  },
  "include": ["scripts/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

**Copy guidance:** Keep `strict`, `resolveJsonModule`, and source maps. For frontend, extend/update include to cover `src/**/*.ts` and `src/**/*.tsx`; add DOM libs for React.

---

### `vitest.config.ts`, `src/test/setup.ts`, `src/**/*.test.{ts,tsx}` (test config and tests, batch)

**Analog:** `vitest.config.ts` and `scripts/__tests__/compiler.test.ts`

**Vitest include pattern** (from `vitest.config.ts`, lines 1-11):
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['scripts/**/*.test.ts', 'src/**/*.test.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    testTimeout: 10000,
    pool: 'threads',
    clearMocks: true,
    restoreMocks: true,
  },
});
```

**Test fixture setup pattern** (from `scripts/__tests__/compiler.test.ts`, lines 1-27):
```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { EntityType } from '../types.js';

const indexConfig = {
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

async function seedConfig(dataDir: string): Promise<void> {
  await fs.writeFile(path.join(dataDir, 'index-config.json'), JSON.stringify(indexConfig));
}
```

**Temp resource cleanup pattern** (from `scripts/__tests__/compiler.test.ts`, lines 56-66):
```ts
describe('Data Compiler', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'compiler-test-'));
    await seedConfig(tmpDir);
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });
```

**Copy guidance:** Frontend tests should follow `describe`/`it` style, build deterministic fixtures locally, and clean up side effects. Add `environment: 'jsdom'` and setup file when React Testing Library is introduced.

---

### `src/data/types.ts` (model, transform)

**Analog:** `scripts/types.ts`

**Entity enum and normalized record pattern** (lines 8-49):
```ts
/** Entity type classification */
export enum EntityType {
  COUNTRY = 'country',
  CITY = 'city',
  CLOUD_REGION = 'cloud-region',
  COMPANY = 'company',
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
```

**Compiled frontend contract pattern** (lines 87-123):
```ts
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
```

**Cross-reference contract pattern** (lines 132-144):
```ts
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
```

**Copy guidance:** Prefer importing from `scripts/types.ts` only if Vite can resolve it cleanly without bundling Node-only code. Otherwise mirror these frontend-safe interfaces in `src/data/types.ts` and keep field names identical.

---

### `src/data/static-json.ts` (utility, file-I/O/request-response)

**Analog:** `scripts/fetch-with-retry.ts` and `scripts/compiler.ts`

**HTTP error/retry style to simplify for browser static JSON** (from `scripts/fetch-with-retry.ts`, lines 22-68):
```ts
export async function fetchWithRetry(
  url: string,
  init: RequestInit = {},
  opts: FetchOptions = {},
): Promise<Response> {
  const { retries = 3, baseDelayMs = 1000, maxDelayMs = 30000, timeoutMs = 30000 } = opts;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let gotResponse = false;
    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timer);
      gotResponse = true;

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

      // Non-retryable HTTP error (4xx except 429) -- throw immediately
      throw new Error(`HTTP ${response.status}: ${response.statusText} for ${url}`);
    } catch (err) {
      clearTimeout(timer);
      // If we got a response (HTTP error), never retry
      if (gotResponse) throw err;
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

**JSON parsing pattern** (from `scripts/compiler.ts`, lines 52-55):
```ts
async function loadJsonFile<T>(filePath: string): Promise<T> {
  const raw = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(raw) as T;
}
```

**Research base-path pattern** (`03-RESEARCH.md` lines 240-254):
```ts
import { useQuery } from '@tanstack/react-query';

async function fetchStaticJson<T>(path: string): Promise<T> {
  const response = await fetch(`${import.meta.env.BASE_URL}${path}`);
  if (!response.ok) throw new Error(`Failed to load ${path}: ${response.status}`);
  return response.json() as Promise<T>;
}

export function useLatestIndex() {
  return useQuery({
    queryKey: ['data', 'latest'],
    queryFn: () => fetchStaticJson<LatestIndex>('data/latest.json'),
  });
}
```

**Copy guidance:** For frontend static JSON, do not import Node `fs`. Copy the generic parse/error style but use `fetch(`${import.meta.env.BASE_URL}${path}`)`. Throw typed, descriptive errors on non-OK responses.

---

### `src/data/queries.ts` and `src/app/providers.tsx` (hook/provider, request-response/cache)

**Analog:** RESEARCH React Query provider + current compiler output shape.

**Provider pattern** (`03-RESEARCH.md` lines 412-421):
```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
```

**Compiler output shape for latest** (from `scripts/compiler.ts`, lines 229-253):
```ts
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
```

**Copy guidance:** Query keys should map directly to static files: `['data','latest']`, `['data','rankings']`, `['data','history']`, `['data','index-config']`, `['data','crossref']`, `['data','geo','countries']`.

---

### `src/app/router.tsx` and `src/main.tsx` (route/app entry, request-response/static-entry)

**Analog:** No in-repo frontend analog. Use researched HashRouter pattern.

**HashRouter pattern** (`03-RESEARCH.md` lines 220-232):
```tsx
import { HashRouter, Route, Routes } from 'react-router';

export function AppRouter() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<MapExplorer />} />
        <Route path="/entity/:type/:id" element={<EntityDetailRoute />} />
      </Routes>
    </HashRouter>
  );
}
```

**Lazy route boundary pattern** (`03-RESEARCH.md` lines 424-437):
```tsx
import { lazy, Suspense } from 'react';

const EntityDetailRoute = lazy(() => import('../features/details/EntityDetailRoute'));

export function LazyDetailBoundary() {
  return (
    <Suspense fallback={<div className="font-mono text-cyan-200">Loading detail...</div>}>
      <EntityDetailRoute />
    </Suspense>
  );
}
```

**Copy guidance:** Use `HashRouter`, not `BrowserRouter`. Keep map shell at `/`; detail routes should synchronize map selection and side rail, not replace the map-first flow.

---

### `src/store/explorer-store.ts` (store, event-driven)

**Analog:** No in-repo store analog. Use researched Zustand pattern.

**Zustand pattern** (`03-RESEARCH.md` lines 312-325):
```ts
import { create } from 'zustand';

interface ExplorerState {
  level: 'country' | 'city' | 'cloud-region' | 'company';
  selectedId: string | null;
  setSelection: (level: ExplorerState['level'], id: string | null) => void;
}

export const useExplorerStore = create<ExplorerState>((set) => ({
  level: 'country',
  selectedId: null,
  setSelection: (level, selectedId) => set({ level, selectedId }),
}));
```

**Copy guidance:** Store only UI/exploration state: selected entity, hovered entity, active layer, ranking scope, and viewport intent. Do not duplicate React Query data in Zustand.

---

### `src/features/map/ComputeMap.tsx` (component, event-driven/map)

**Analog:** No in-repo frontend analog. Use researched MapLibre pattern and existing crossref data.

**MapLibre import/source/layer pattern** (`03-RESEARCH.md` lines 262-285):
```tsx
import 'maplibre-gl/dist/maplibre-gl.css';
import Map, { Layer, Source } from 'react-map-gl/maplibre';

export function ComputeMap({ countries }: { countries: GeoJSON.FeatureCollection }) {
  return (
    <Map
      initialViewState={{ longitude: 0, latitude: 20, zoom: 1.2 }}
      mapStyle="https://demotiles.maplibre.org/style.json"
      interactiveLayerIds={['country-score-fill']}
    >
      <Source id="countries" type="geojson" data={countries}>
        <Layer
          id="country-score-fill"
          type="fill"
          paint={{
            'fill-color': ['interpolate', ['linear'], ['get', 'score'], 0, '#10202a', 100, '#00ff99'],
            'fill-opacity': 0.72,
          }}
        />
      </Source>
    </Map>
  );
}
```

**Copy guidance:** Add `interactiveLayerIds` for country fill and later marker layers. Country click must zoom first (D-02) and update selected state/route second.

---

### `src/features/map/country-join.ts` (utility, transform)

**Analog:** `scripts/compiler.ts` aggregation and map-building transforms.

**Map/set transformation pattern** (from `scripts/compiler.ts`, lines 140-156):
```ts
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
```

**Virtual/aggregate entity creation pattern** (from `scripts/compiler.ts`, lines 157-188):
```ts
for (const [countryId, factors] of aggregateToCountries(entities, crossRef)) {
  const existing = rawFactors.get(countryId) ?? {};
  rawFactors.set(countryId, { ...factors, ...existing });
  if (!allEntities.has(countryId)) {
    const sourceEntities = Array.from(entities.values())
      .filter(entity => crossRef.cloudRegions[entity.id]?.country === countryId);
    allEntities.set(countryId, virtualEntity(
      countryId,
      EntityType.COUNTRY,
      crossRef.countries[countryId]?.name ?? countryId,
      factors,
      newestTimestamp(sourceEntities, new Date().toISOString()),
    ));
    entityTypes.set(countryId, EntityType.COUNTRY);
  }
}
```

**Copy guidance:** Use explicit lookup maps when joining boundary features to ComputeAtlas entity IDs. Do not infer country matches only by display name; include ISO/name mapping tests.

---

### `src/features/map/drilldown.ts` (utility, event-driven/transform)

**Analog:** `scripts/mappings/entity-crossref.json`

**Hierarchy source pattern** (lines 13-37):
```json
"cloudRegions": {
  "aws-us-east-1": { "country": "us", "city": "ashburn", "provider": "aws" },
  "aws-us-west-2": { "country": "us", "city": "portland", "provider": "aws" },
  "aws-eu-west-1": { "country": "ie", "city": "dublin", "provider": "aws" },
  "aws-eu-central-1": { "country": "de", "city": "frankfurt", "provider": "aws" },
  "aws-ap-northeast-1": { "country": "jp", "city": "tokyo", "provider": "aws" },
  "aws-ap-southeast-1": { "country": "sg", "city": "singapore", "provider": "aws" },
  "aws-sa-east-1": { "country": "br", "city": "sao-paulo", "provider": "aws" },
  "azure-eastus": { "country": "us", "city": "ashburn", "provider": "azure" },
  "azure-westus3": { "country": "us", "city": "portland", "provider": "azure" },
  "azure-westeurope": { "country": "nl", "city": "amsterdam", "provider": "azure" },
  "azure-northeurope": { "country": "ie", "city": "dublin", "provider": "azure" },
  "azure-japaneast": { "country": "jp", "city": "tokyo", "provider": "azure" },
  "azure-southeastasia": { "country": "sg", "city": "singapore", "provider": "azure" },
  "azure-centralindia": { "country": "in", "city": "pune", "provider": "azure" },
  "azure-canadacentral": { "country": "ca", "city": "toronto", "provider": "azure" },
  "azure-uksouth": { "country": "gb", "city": "london", "provider": "azure" },
  "azure-germanywestcentral": { "country": "de", "city": "frankfurt", "provider": "azure" },
  "azure-chinaeast2": { "country": "cn", "city": "shanghai", "provider": "azure" },
  "gcp-us-central1": { "country": "us", "city": "council-bluffs", "provider": "gcp" },
  "gcp-europe-west1": { "country": "be", "city": "st-ghislain", "provider": "gcp" },
  "gcp-asia-east1": { "country": "tw", "city": "changhua", "provider": "gcp" },
  "oracle-us-ashburn-1": { "country": "us", "city": "ashburn", "provider": "oracle" },
  "ibm-us-south": { "country": "us", "city": "dallas", "provider": "ibm" }
}
```

**Company overlay source pattern** (lines 60-66):
```json
"companies": {
  "nvidia": { "cik": "0001045810", "country": "us", "name": "NVIDIA" },
  "microsoft": { "cik": "0000789019", "country": "us", "name": "Microsoft" },
  "alphabet": { "cik": "0001652044", "country": "us", "name": "Alphabet/Google" },
  "amazon": { "cik": "0001018724", "country": "us", "name": "Amazon" },
  "meta": { "cik": "0001326801", "country": "us", "name": "Meta" }
}
```

**Copy guidance:** Drill-down should derive country → city → cloud-region from this mapping. Company overlays must be labeled as corporate influence and joined to country, not plotted as precise facilities.

---

### `src/features/rankings/RankingRail.tsx` (component, read-only transform)

**Analog:** `scripts/compiler.ts` `writeRankings`

**Ranking output pattern** (lines 255-288):
```ts
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
```

**Copy guidance:** Frontend ranking UI should not recompute authoritative score. It may filter/slice/sort for display but should respect `rank`, `entityId`, `score`, and `confidence` from `rankings.json`.

---

### `src/features/details/EntityDetailRoute.tsx`, `src/components/StatusBadges.tsx` (component/route, request-response/read-only)

**Analog:** `scripts/types.ts` and `scripts/compiler.ts` `writeLatest`

**Fields to display** (from `scripts/types.ts`, lines 87-108):
```ts
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
```

**Compiler latest JSON shape** (from `scripts/compiler.ts`, lines 233-252):
```ts
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
```

**Copy guidance:** Detail and badge components must show confidence, partial/full completeness, freshness from `lastUpdated`, and risk fields as modeling assumptions.

---

### `src/features/details/FactorBreakdown.tsx` (component, transform)

**Analog:** `scripts/compiler.ts` `buildFactorBreakdown` + `public/data/index-config.json`

**Factor breakdown construction pattern** (from `scripts/compiler.ts`, lines 110-124):
```ts
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
```

**Factor labels/config source** (from `public/data/index-config.json`, lines 1-17):
```json
{
  "version": 1,
  "factors": {
    "gpu_supply": { "weight": 0.30, "description": "GPU pricing density across cloud regions (inverse price = higher supply)" },
    "energy_capacity": { "weight": 0.20, "description": "Power generation and consumption capacity" },
    "cloud_region_density": { "weight": 0.15, "description": "Number of cloud regions/zones per entity" },
    "ai_capex": { "weight": 0.25, "description": "Company AI capital expenditure (annualized TTM)" },
    "risk_adjustment": { "weight": 0.10, "description": "Export control risk tier multiplier" }
  },
  "confidence": {
    "staleDays": 30,
    "stalePenalty": 1,
    "veryStaleDays": 90,
    "veryStalePenalty": 2,
    "missingFactorPenalty": 1,
    "minConfidence": 1
  }
}
```

**Copy guidance:** Display raw value, normalized score, and weight separately. Use `index-config.json` descriptions for labels/tooltips.

---

### `src/features/trends/TrendChart.tsx` and `src/features/trends/trend-options.ts` (component/utility, history transform)

**Analog:** RESEARCH ECharts lazy pattern + `scripts/compiler.ts` `writeHistory`

**ECharts core import pattern** (`03-RESEARCH.md` lines 293-304):
```tsx
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([LineChart, GridComponent, TooltipComponent, CanvasRenderer]);

export function TrendChart({ option }: { option: echarts.EChartsCoreOption }) {
  return <ReactEChartsCore echarts={echarts} option={option} notMerge lazyUpdate />;
}
```

**History output pattern** (from `scripts/compiler.ts`, lines 291-323):
```ts
async function writeHistory(
  scoredEntities: Map<string, ScoredEntity>,
  dataDir: string,
): Promise<void> {
  const historyPath = path.join(dataDir, 'history.json');
  let history: Record<string, {
    type: EntityType;
    name: string;
    series: Array<{ timestamp: string; score: number; factors: Record<string, number> }>;
  }> = {};

  try {
    history = await loadJsonFile<typeof history>(historyPath);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
  }

  for (const [id, scored] of scoredEntities) {
    history[id] = {
      type: scored.entity.type,
      name: scored.entity.latest.entity.name,
      series: [
        ...(history[id]?.series ?? []),
        {
          timestamp: new Date().toISOString(),
          score: scored.score,
          factors: scored.factors,
        },
      ],
    };
  }

  await fs.writeFile(historyPath, JSON.stringify(history, null, 2));
}
```

**Copy guidance:** Build chart options from `history[id].series[]`. Keep all ECharts code behind lazy route/selection boundaries and use core imports only.

---

### `public/data/geo/countries-110m.json` (static asset, file-I/O)

**Analog:** `public/data/index-config.json`

**Static JSON asset style** (from `public/data/index-config.json`, lines 1-17):
```json
{
  "version": 1,
  "factors": {
    "gpu_supply": { "weight": 0.30, "description": "GPU pricing density across cloud regions (inverse price = higher supply)" },
    "energy_capacity": { "weight": 0.20, "description": "Power generation and consumption capacity" },
    "cloud_region_density": { "weight": 0.15, "description": "Number of cloud regions/zones per entity" },
    "ai_capex": { "weight": 0.25, "description": "Company AI capital expenditure (annualized TTM)" },
    "risk_adjustment": { "weight": 0.10, "description": "Export control risk tier multiplier" }
  }
}
```

**Copy guidance:** Keep geography under `public/data/geo/` and load by URL, not by importing into TS/TSX. This avoids embedding large geometry in JS chunks.

---

## Shared Patterns

### ESM import/export conventions

**Source:** `scripts/compiler.ts`, `scripts/run-pipeline.ts`, `scripts/scrapers/aws-gpu-pricing.ts`
**Apply to:** All TypeScript modules

```ts
import fs from 'node:fs/promises';
import path from 'node:path';
import { EntityType } from './types.js';
import type { CompiledEntity, EntityCrossRef } from './types.js';
```

**Guidance:** Project is ESM. Existing internal imports include `.js` extensions in script modules because of `NodeNext`. Frontend Vite modules may use extensionless relative imports if TS/Vite config supports it, but do not introduce CommonJS.

### Static data output contracts

**Source:** `scripts/compiler.ts`
**Apply to:** `src/data/types.ts`, `src/data/queries.ts`, map/ranking/detail/trend features

```ts
JSON.stringify({ generated: new Date().toISOString(), entities: latest }, null, 2)
JSON.stringify({ generated: new Date().toISOString(), byType }, null, 2)
history[id] = {
  type: scored.entity.type,
  name: scored.entity.latest.entity.name,
  series: [
    ...(history[id]?.series ?? []),
    { timestamp: new Date().toISOString(), score: scored.score, factors: scored.factors },
  ],
};
```

**Guidance:** Frontend should consume compiler outputs as source of truth. Do not recompute scores, risk multipliers, or confidence in React.

### Error handling for missing data

**Source:** `scripts/compiler.ts`, `scripts/run-pipeline.ts`, `scripts/fetch-with-retry.ts`
**Apply to:** Static fetchers, query hooks, loading/error states

```ts
try {
  history = await loadJsonFile<typeof history>(historyPath);
} catch (err) {
  if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
}
```

```ts
if (!response.ok) return/throw descriptive error;
```

**Guidance:** Missing optional data can produce fallback UI, but malformed core assets (`latest.json`, `rankings.json`, `index-config.json`) should fail visibly with useful error states.

### Tests use deterministic fixtures and explicit assertions

**Source:** `scripts/__tests__/compiler.test.ts`
**Apply to:** All frontend tests

```ts
expect(latest).toHaveProperty('generated');
expect(entity).toHaveProperty('score');
expect(entity).toHaveProperty('confidence');
expect(entity).toHaveProperty('factorBreakdown');
expect(entity).toHaveProperty('dataCompleteness');
```

**Guidance:** Component tests should assert user-visible output for score, confidence, completeness, risk, freshness, and route state. Utility tests should cover country joins and hierarchy derivation.

### HUD visual constraints

**Source:** `03-CONTEXT.md` decisions D-06 through D-09; no source analog yet
**Apply to:** `src/components/HudPanel.tsx`, `StatusBadges.tsx`, map shell, rankings, detail rail

**Guidance:** Use restrained dark Bloomberg/HUD style: mono-heavy metrics, cyan for selection/map interactions, green for capacity/growth, thin translucent borders, and glass panels only where readability remains strong.

## No Analog Found

Files with no close in-repo analog because this phase introduces the first React/Vite frontend source tree. Planner should use the researched official patterns cited in `/Users/yiwei/ics/iait/.planning/phases/03-frontend-visualization/03-RESEARCH.md`.

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `index.html` | config | request-response/static-entry | No browser entrypoint exists yet |
| `src/main.tsx` | app entry | request-response/static-entry | No React source tree exists yet |
| `src/app/App.tsx` | component | request-response | No existing React components |
| `src/app/router.tsx` | route | request-response | No existing router; use HashRouter research pattern |
| `src/app/providers.tsx` | provider | request-response/cache | No existing React provider; use React Query research pattern |
| `src/styles/index.css` | config/style | transform | No existing CSS/Tailwind entry |
| `src/store/explorer-store.ts` | store | event-driven | No existing Zustand store; use research pattern |
| `src/features/map/ComputeMap.tsx` | component | event-driven/map | No existing map component; use MapLibre research pattern |
| `src/features/trends/TrendChart.tsx` | component | history/chart render | No existing chart component; use ECharts research pattern |
| `src/components/HudPanel.tsx` | component | render | No existing UI component library |
| `src/components/LoadingState.tsx` | component | render | No existing UI component library |

## Metadata

**Analog search scope:** `/Users/yiwei/ics/iait/.claude/worktrees/agent-a1a9dd47befd7d1d9/package.json`, `vitest.config.ts`, `tsconfig.json`, `scripts/**/*.ts`, `scripts/__tests__/**/*.ts`, `scripts/mappings/*.json`, `public/data/*.json`, plus Phase 3 research from `/Users/yiwei/ics/iait/.planning/phases/03-frontend-visualization/03-RESEARCH.md`.

**Files scanned/read:** 14 direct code/config/data files plus Phase 3 context and research.

**Strong analogs used:**
- `scripts/types.ts` — frontend data contracts
- `scripts/compiler.ts` — aggregate JSON shapes, rankings, history, factor breakdown, transforms
- `scripts/fetch-with-retry.ts` — fetch/error style
- `scripts/run-pipeline.ts` — orchestration and missing-data handling
- `scripts/__tests__/compiler.test.ts` — Vitest fixture/test style
- `vitest.config.ts` — test config style
- `package.json` / `tsconfig.json` — ESM and strict TypeScript config
- `public/data/index-config.json` / `scripts/mappings/entity-crossref.json` — static frontend data inputs

**Pattern extraction date:** 2026-05-07
