# Architecture Patterns

**Domain:** Pure-frontend data visualization platform with automated data pipeline (no backend)
**Researched:** 2026-05-06

## Recommended Architecture

ComputeAtlas follows a **dual-repository-within-one** pattern: the same repo contains both the data pipeline (Node.js, runs in GitHub Actions) and the frontend (React + Vite, deployed to GitHub Pages). The key architectural boundary is that the pipeline writes static JSON files that the frontend reads at runtime. No shared code crosses this boundary at runtime; the shared TypeScript types are compile-time only.

```
[GitHub Actions (cron)]                    [GitHub Pages (static)]
  scrapers/                                src/site/
    aws-pricing ──┐                         App.tsx
    azure-pricing ─┤                        pages/
    owid-energy ───┤  ┌──────────────┐      Heatmap.tsx
    world-bank ────┤  │  data/       │      Rankings.tsx
    sec-edgar ─────┤──│  normalized/ │──>   Trends.tsx
    news-rss ──────┤  │  index/      │      Detail.tsx
    llm-extract ───┤  └──────────────┘
    manual ────────┘         │
         │                   ▼
    index-model      public/data/
    (compute)        (static JSON files)
         │                   │
         ▼                   ▼
    git commit ──────> main branch ──> Pages deploy
```

### Component Boundaries

| Component | Responsibility | Runs In | Communicates With |
|-----------|---------------|---------|-------------------|
| **Scraper modules** (`scripts/scrapers/`) | Fetch raw data from external APIs, write to `data/raw/` | GitHub Actions | External APIs only |
| **Normalizer** (`scripts/normalize/`) | Transform raw data into canonical schemas, write to `data/normalized/` | GitHub Actions | Reads `data/raw/`, writes `data/normalized/` |
| **Index model** (`scripts/model/`) | Compute index scores, rankings, trends; write to `data/index/` | GitHub Actions | Reads `data/normalized/` + `data/manual/`, writes `data/index/` |
| **LLM extractor** (`scripts/extract/`) | Call GitHub Models to structure unstructured text | GitHub Actions | GitHub Models API, writes `data/normalized/` |
| **Manual curation** (`data/manual/`) | Hand-maintained JSON for export controls, HBM estimates | Editor/PR | Reads by index model |
| **Data compiler** (`scripts/compile/`) | Copy index output to `public/data/` for frontend consumption | GitHub Actions (post-compute) | Reads `data/index/`, writes `public/data/` |
| **Frontend app** (`src/site/`) | React SPA: map, charts, rankings, drill-down | Browser | Reads `/data/*.json` from same origin |
| **Deploy workflow** (`.github/workflows/`) | Build frontend, deploy to Pages | GitHub Actions | Git push triggers Pages deploy |

### Data Flow

```
Direction: Left-to-right, one-way. No backward data flow.

External APIs ──> data/raw/{source}/{date}.json
                    │
                    ▼
              data/normalized/{source}.json   (latest snapshot + rolling window)
                    │
                    ▼
              data/index/                      (computed scores)
                ├── current.json               (latest index for all entities)
                ├── history.json               (time-series, last 90 days)
                ├── rankings.json              (sorted by index score)
                ├── entities.json              (metadata: countries, cities, regions)
                └── confidence.json            (per-entity confidence breakdown)
                    │
                    ▼
              public/data/                     (symlinked/copied for frontend)
                    │
                    ▼
              Frontend lazy-loads via fetch()
```

## Patterns to Follow

### Pattern 1: Scraper Interface + Registry

**What:** Every scraper implements a common `DataSource` interface. A registry discovers and runs all scrapers. New scrapers are added by dropping a file into the directory.

**When:** Always -- this is the core extensibility mechanism.

**Example:**

```typescript
// scripts/scrapers/types.ts
interface DataSource<T = unknown> {
  readonly name: string;
  readonly sourceLayer: 'structured-api' | 'rss-rules' | 'llm-extraction' | 'manual-curation';
  readonly schedule: 'every-run' | 'daily' | 'weekly' | 'manual';

  /** Fetch and return normalized data. Throws on failure. */
  fetch(): Promise<RawResult<T>>;

  /** Transform raw result into canonical schema. */
  normalize(raw: RawResult<T>): NormalizedRecord[];
}

interface RawResult<T> {
  data: T;
  fetchedAt: string;       // ISO timestamp
  sourceUrl: string;
  httpStatus?: number;
  metadata?: Record<string, unknown>;
}

interface NormalizedRecord {
  entityId: string;         // e.g. "us-east-1", "country:US", "company:nvidia"
  entityType: 'country' | 'city' | 'cloud-region' | 'company' | 'datacenter';
  metric: string;           // e.g. "gpu-price-hr", "energy-twh", "capex-usd-bn"
  value: number;
  unit: string;
  timestamp: string;        // when the underlying data was measured
  confidence: number;       // 1-5
  sourceLayer: string;
  sourceUrl: string;
}

// scripts/scrapers/registry.ts
// Auto-discovers all .ts files in scripts/scrapers/sources/ and instantiates them.
// Each source file exports `export default class implements DataSource { ... }`
```

**Why this way:** Plugin-style architecture means adding a new data source (e.g., Google Cloud pricing later) requires only one new file. The registry auto-discovers it. No central configuration to update. Each scraper is independently testable.

### Pattern 2: Time-Series as Append-Only JSON Lines

**What:** Store time-series data as one JSON file per entity (country, city, region) with an append-only array of `{ timestamp, value, confidence }` entries.

**When:** For all index data that needs historical trends.

**Example:**

```json
// data/index/history/country/US.json
{
  "entityId": "country:US",
  "entityType": "country",
  "metric": "ai-compute-index",
  "series": [
    { "ts": "2026-05-06T00:00:00Z", "value": 87.3, "confidence": 4.2 },
    { "ts": "2026-05-06T06:00:00Z", "value": 87.5, "confidence": 4.2 },
    { "ts": "2026-05-06T12:00:00Z", "value": 87.1, "confidence": 4.3 }
  ]
}
```

**Why this way:**
- Per-entity files mean the frontend loads only the entity the user is viewing (lazy loading).
- Append-only means the compute script never recalculates history; it reads the last entry, computes the new one, pushes it, and trims entries older than 90 days.
- GitHub Pages serves these files with gzip automatically, keeping transfer sizes small.

### Pattern 3: Normalization-Then-Composition (Index Pipeline)

**What:** The index computation is a two-phase pipeline: (1) normalize each factor to a 0-100 scale per entity, (2) compose weighted factors into the final index score.

**When:** For all index computation. This is the core mathematical model.

**Example:**

```typescript
// scripts/model/factors.ts

interface FactorDefinition {
  id: string;                     // e.g. "gpu-supply", "energy-capacity"
  weight: number;                 // 0.0 - 1.0, all weights sum to 1.0
  normalize: (raw: number, allValues: number[]) => number;  // returns 0-100
  confidenceWeight: number;       // how much to penalize low-confidence data
}

const FACTORS: FactorDefinition[] = [
  {
    id: 'gpu-supply',
    weight: 0.35,
    normalize: (raw, all) => percentileRank(raw, all) * 100,
    confidenceWeight: 0.8,
  },
  {
    id: 'energy-capacity',
    weight: 0.25,
    normalize: (raw, all) => minMaxScale(raw, all) * 100,
    confidenceWeight: 0.6,
  },
  {
    id: 'capex-growth',
    weight: 0.25,
    normalize: (raw, all) => percentileRank(raw, all) * 100,
    confidenceWeight: 0.9,
  },
  {
    id: 'risk-adjustment',
    weight: 0.15,
    normalize: (raw, _all) => (1 - raw) * 100,  // inverted: lower risk = higher score
    confidenceWeight: 0.5,
  },
];

// scripts/model/compute.ts
function computeIndex(entity: Entity, factorScores: Map<string, number>, confidences: Map<string, number>): IndexScore {
  let weightedSum = 0;
  let totalWeight = 0;
  let confidenceSum = 0;

  for (const factor of FACTORS) {
    const score = factorScores.get(factor.id) ?? 50;  // default neutral
    const conf = confidences.get(factor.id) ?? 1;
    const effectiveWeight = factor.weight * (1 - factor.confidenceWeight * (1 - conf / 5));

    weightedSum += score * effectiveWeight;
    totalWeight += effectiveWeight;
    confidenceSum += conf * factor.weight;
  }

  return {
    value: weightedSum / totalWeight,       // 0-100 composite score
    confidence: confidenceSum,               // weighted average confidence
    factorBreakdown: Object.fromEntries(factorScores),
  };
}
```

**Normalization strategy:** Use percentile rank (not min-max) for supply and CapEx factors because it is robust to outliers. Use min-max for energy where absolute magnitude matters. Invert the risk factor so lower risk produces higher scores.

**Confidence integration:** Low-confidence factors get their effective weight reduced proportionally. A factor with confidence 1/5 and base weight 0.35 contributes as if its weight were ~0.23. This means the index degrades gracefully when data is sparse rather than producing misleading scores.

### Pattern 4: Incremental Compute via State File

**What:** The compute script reads a `data/state.json` file containing the previous run's intermediate results (normalized factor values, entity list). On each run, it only re-fetches data sources that are stale (based on schedule) and recomputes only entities whose inputs changed.

**When:** Every scheduled run. This keeps GitHub Actions execution time under 10 minutes.

**Example:**

```json
// data/state.json
{
  "lastRun": "2026-05-06T12:00:00Z",
  "sources": {
    "aws-pricing": { "lastFetched": "2026-05-06T12:00:00Z", "nextDue": "2026-05-06T18:00:00Z" },
    "owid-energy": { "lastFetched": "2026-05-06T00:00:00Z", "nextDue": "2026-05-07T00:00:00Z" },
    "sec-edgar": { "lastFetched": "2026-05-05T00:00:00Z", "nextDue": "2026-05-12T00:00:00Z" }
  },
  "entities": {
    "country:US": { "lastComputed": "2026-05-06T12:00:00Z" }
  }
}
```

**Why this way:** SEC EDGAR data changes quarterly -- no reason to re-fetch it every 6 hours. Energy data changes annually. Only cloud pricing needs near-real-time updates. The state file tracks what is fresh and what needs refreshing, saving API calls and execution time.

### Pattern 5: Frontend Chunked Data Loading

**What:** The frontend loads data in layers: first the overview JSON (small, ~50KB), then entity-specific JSON on demand.

**When:** All frontend data loading.

**Architecture:**

```
public/data/
  ├── overview.json          (~50KB: top-level rankings, heatmap points, summary stats)
  ├── entities.json          (~20KB: entity metadata, coordinates, names)
  ├── history/
  │   ├── country/US.json    (~5KB per country, 90 days of data points)
  │   ├── country/CN.json
  │   ├── city/SF.json
  │   └── region/us-east-1.json
  └── index/
      ├── rankings.json      (~30KB: full sorted list)
      └── confidence.json    (~15KB: per-entity breakdowns)
```

**Loading sequence:**
1. App loads `overview.json` + `entities.json` on page load (~70KB total, gzips to ~15KB).
2. Heatmap renders from overview data (lat/lng + index score per entity).
3. When user clicks an entity, fetch `history/{type}/{id}.json` on demand (~5KB).
4. Rankings page fetches `rankings.json` (~30KB gzips to ~8KB).

**Caching strategy:** Set `Cache-Control: max-age=3600` via a `<meta>` tag or service worker. Data updates 4x/day, so a 1-hour cache is safe. For offline/direct visits, the browser HTTP cache is sufficient. No service worker needed for MVP.

### Pattern 6: GitHub Actions Workflow Structure

**What:** Two separate workflows: (1) data pipeline (fetch, normalize, compute, commit), (2) build and deploy (triggered by push to main).

**When:** Always. Separating concerns prevents a scraper failure from blocking deployment of already-computed data.

**Example workflow files:**

```yaml
# .github/workflows/data-pipeline.yml
name: Data Pipeline
on:
  schedule:
    - cron: '0 */6 * * *'    # UTC 0, 6, 12, 18
  workflow_dispatch:           # manual trigger

permissions:
  contents: write              # needed to commit data files
  models: read                 # needed for GitHub Models

concurrency:
  group: data-pipeline
  cancel-in-progress: false    # let running pipeline finish

jobs:
  scrape-and-compute:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - name: Run scrapers (incremental)
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          GH_MODELS_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: node scripts/run-pipeline.mjs
      - name: Commit data changes
        uses: stefanzweifel/git-auto-commit-action@v5
        with:
          commit_message: "data: update ${{ github.run_id }}"
          file_pattern: 'data/ public/data/'
```

```yaml
# .github/workflows/deploy.yml
name: Deploy to Pages
on:
  push:
    branches: [main]
    paths: ['public/**', 'src/**', 'index.html']
  workflow_dispatch:

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }
      - uses: actions/deploy-pages@v4
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Single Monolithic JSON File for All Data

**What:** Storing all entity data, history, and rankings in one giant `data.json` file.

**Why bad:** A file with 90 days of history for 100+ entities at 4 entries/day is ~36,000 data points. Minified JSON with this volume is 2-5MB. Users on slow connections wait for the entire file before seeing anything. Every data update touches the same file, causing merge conflicts in concurrent Actions runs.

**Instead:** Split by entity (per-file), separate current from history, and load progressively. The overview JSON is ~50KB and renders the heatmap immediately.

### Anti-Pattern 2: Full Recomputation Every Run

**What:** Re-downloading all data sources and recalculating all entities on every 6-hour run.

**Why bad:** SEC EDGAR data changes quarterly. OWID energy data updates annually. Re-fetching them wastes API calls and risks hitting rate limits. Full recomputation of 100+ entities takes longer than the 15-minute timeout target.

**Instead:** Use the state file pattern (Pattern 4). Track `lastFetched` per source, `lastComputed` per entity. Only re-fetch stale sources, only recompute affected entities.

### Anti-Pattern 3: Tight Coupling Between Scraper and Normalizer

**What:** Scraper outputs data in a format that only one normalizer can consume, or the normalizer is embedded inside the scraper.

**Why bad:** You cannot test scrapers independently. You cannot swap normalization logic without modifying scrapers. Adding a new data source requires understanding the normalization pipeline.

**Instead:** Scrapers output to `data/raw/{source}/{date}.json` in their native format. Normalizers read from `data/raw/` and write to `data/normalized/{source}.json` in the canonical schema. The two can be developed, tested, and updated independently.

### Anti-Pattern 4: Using React Router's BrowserRouter on GitHub Pages

**What:** Using `BrowserRouter` from react-router-dom for client-side routing.

**Why bad:** GitHub Pages does not support server-side redirects. Direct navigation to `/country/US` returns a 404 because there is no actual file at that path. The `404.html` redirect trick works but adds fragility and breaks the browser back button in some scenarios.

**Instead:** Use `HashRouter`. URLs become `/#/country/US`. The `#` fragment is never sent to the server, so GitHub Pages serves `index.html` for all routes. SEO is not a concern for a data dashboard (no one searches for "AI compute index US" and expects to land on a detail page).

### Anti-Pattern 5: Storing Raw API Responses Long-Term

**What:** Keeping every raw API response in the repository indefinitely.

**Why bad:** AWS pricing JSON for all regions is 50-100MB per fetch. At 4 runs/day, that is 400MB/day. The GitHub repo limit is 5GB. You will hit it in under two weeks.

**Instead:** Keep raw responses only for the current run (in a temp directory or ignored via `.gitignore`). Commit only the normalized output. If historical raw data is needed for debugging, write it to GitHub Actions artifacts with 1-day retention.

### Anti-Pattern 6: LLM Calls for Structured Data That APIs Provide

**What:** Using GitHub Models / GPT-4o-mini to extract data that is already available from a structured API.

**Why bad:** Wastes the 150 calls/day budget. LLM output is non-deterministic and lower confidence than direct API data. Adds latency and failure modes.

**Instead:** Reserve LLM extraction strictly for Layer 3 (unstructured text: earnings calls, news articles, policy documents). If a structured API exists (Layer 1), always prefer it.

## GitHub Actions Practical Constraints

### Execution Limits

| Constraint | Value | Impact on ComputeAtlas |
|-----------|-------|----------------------|
| Max job timeout | 6 hours (default) | Generous. Target 15 minutes per run. |
| Free-tier minutes/month | 2,000 (Linux) | 4 runs/day x 15 min = 1,800 min/month. Tight but viable. If hitting limits, reduce to 2x/day or move heavy sources to weekly. |
| Scheduled workflow delay | Up to 15-20 min | Cron may fire late. Do not depend on exact timing. |
| Concurrent jobs (free) | 20 | Non-issue for a single-workflow pipeline. |

### Secret Management

| Secret | How to Use | Notes |
|--------|-----------|-------|
| `GITHUB_TOKEN` | Built-in, auto-provided. Use for GitHub Models API (`models:read` permission). | No manual setup needed. |
| Custom API keys | Store as repository secrets (`Settings > Secrets > Actions`). | Required if any scraper needs authentication. For MVP, AWS/Azure pricing APIs are public. |

### Rate Limit Considerations

| API | Rate Limit | Strategy |
|-----|-----------|----------|
| AWS Pricing API | No published limit; large JSON download (~50MB) | Filter server-side with query params to reduce payload. Cache response in `data/raw/`. |
| Azure Retail Prices API | 15 requests/second | Paginate with `nextPage` links. Sleep 100ms between pages. |
| SEC EDGAR | 10 requests/second without API key | Add `User-Agent` header (required). Throttle to 5 req/sec. |
| GitHub Models | 150 GPT-4o-mini requests/day | Budget ~37 per run. Batch aggressively. |
| OWID GitHub CSV | GitHub raw file serving (no published limit) | Single file download per dataset. Infrequent (weekly). |
| World Bank API | No published hard limit | Paginate. Single call per indicator/country group. |

### Artifact and Storage Limits

| Constraint | Value | Strategy |
|-----------|-------|----------|
| Repo size (recommended) | < 1 GB | Normalize and compress data. Trim history to 90 days. Do not commit raw API responses. |
| Individual file limit | 100 MB | Split large datasets. Per-entity files stay well under 1 MB. |
| Published site size | < 1 GB | Frontend build + data JSON should be < 100MB even at full scale. |
| Bandwidth | 100 GB/month | Compressed JSON for 10K daily users is ~50 GB/month. Monitor and add CDN if scaling. |

## Scraper Module Design

### Directory Structure

```
scripts/
├── scrapers/
│   ├── types.ts                    # DataSource interface, shared types
│   ├── registry.ts                 # Auto-discovers and loads scrapers
│   ├── sources/
│   │   ├── aws-pricing.ts          # Layer 1: Structured API
│   │   ├── azure-pricing.ts        # Layer 1: Structured API
│   │   ├── owid-energy.ts          # Layer 1: Structured API (CSV from GitHub)
│   │   ├── world-bank-energy.ts    # Layer 1: Structured API
│   │   ├── sec-edgar-capex.ts      # Layer 1: Structured API (XBRL)
│   │   ├── news-rss.ts             # Layer 2: RSS + Rules
│   │   ├── llm-earnings.ts         # Layer 3: LLM Extraction
│   │   ├── llm-news.ts             # Layer 3: LLM Extraction
│   │   └── llm-policy.ts           # Layer 3: LLM Extraction
│   └── __tests__/
│       ├── aws-pricing.test.ts
│       └── ...
├── normalize/
│   ├── index.ts                    # Runs all normalizers
│   └── normalizers/
│       ├── cloud-pricing.ts        # Merges AWS + Azure into unified schema
│       ├── energy.ts               # Merges OWID + World Bank
│       ├── capex.ts                # Normalizes SEC EDGAR data
│       └── news-events.ts          # Normalizes LLM-extracted events
├── model/
│   ├── index.ts                    # Main compute entry point
│   ├── factors.ts                  # Factor definitions and weights
│   ├── compute.ts                  # Index computation logic
│   ├── state.ts                    # Incremental state management
│   └── __tests__/
│       └── compute.test.ts
├── extract/
│   ├── client.ts                   # GitHub Models API wrapper
│   ├── prompts/
│   │   ├── earnings-call.ts        # Prompt template for earnings analysis
│   │   ├── news-batch.ts           # Prompt template for news extraction
│   │   └── policy-change.ts        # Prompt template for policy detection
│   └── __tests__/
│       └── prompts.test.ts
├── compile/
│   └── index.ts                    # Copies data/index/ to public/data/
├── run-pipeline.mjs                # Entry point: orchestrates full pipeline
└── lib/
    ├── fetch-with-retry.ts         # HTTP client with retry + backoff
    ├── throttle.ts                 # Rate limiter
    └── logger.ts                   # Structured logging for Actions output
```

### How to Add a New Data Source

1. Create `scripts/scrapers/sources/{new-source}.ts`
2. Implement the `DataSource` interface (name, sourceLayer, schedule, fetch, normalize)
3. Export a default instance: `export default new NewSource()`
4. The registry auto-discovers it on next run
5. If the source uses a new metric type, add a normalizer in `scripts/normalize/normalizers/`
6. If the metric feeds into the index, add a factor definition in `scripts/model/factors.ts`

No other files need modification. This is the zero-touch extension pattern.

### LLM Extraction Pipeline

```
scripts/extract/
  client.ts           ── Wraps fetch() to GitHub Models API
                         Handles retry, rate limit headers, error logging
  prompts/             ── Each file exports a function:
    earnings-call.ts      buildPrompt(company: string, filing: string) => string
    news-batch.ts         buildPrompt(items: NewsItem[]) => string
    policy-change.ts      buildPrompt(text: string, lastKnown: Policy) => string

Usage in scraper:
  const client = createModelsClient(process.env.GH_MODELS_TOKEN);
  const response = await client.chat(prompt, { maxTokens: 4096 });
  const extracted = JSON.parse(response);  // enforce JSON schema in prompt
```

**Budget allocation per run (37 calls):**

| Use | Calls/Batch | Runs/Day | Calls/Run | Total/Day |
|-----|------------|----------|-----------|-----------|
| Earnings filings | 1 per company | 4 | 5 (5 companies) | 20 |
| News batching | 15-20 items per call | 4 | 3 batches | 12 |
| Policy change detection | 1 per check | 4 | 1 | 4 |
| Buffer for retries | - | - | - | 1 |
| **Total** | | | | **37** |

## Index Model Design

### Factor Composition

```
AI Compute Index (0-100)
├── GPU Supply Proxy (weight: 0.35)
│   ├── Cloud GPU pricing signals (AWS p5/g6, Azure NC/HB)
│   │   └── Inverse: lower price relative to peers = more supply = higher score
│   ├── Cloud region count with GPU instances
│   └── Confidence: HIGH (structured API data)
│
├── Energy Capacity (weight: 0.25)
│   ├── National electricity generation (OWID)
│   ├── Renewable energy share (proxy for sustainable DC growth)
│   └── Confidence: MEDIUM (annual data, lagging indicator)
│
├── CapEx Growth (weight: 0.25)
│   ├── Company AI CapEx from SEC EDGAR (NVIDIA, AMD, MSFT, GOOG, AMZN)
│   ├── Year-over-year change rate
│   ├── Country allocation (from company geography mapping)
│   └── Confidence: HIGH (SEC filings are audited)
│
└── Risk Adjustment (weight: 0.15)
    ├── Export control tier (manual curation, Layer 4)
    ├── Geopolitical stability index (manual lookup)
    └── Confidence: LOW-MEDIUM (manual + heuristic)
```

### Normalization Approach

| Factor | Raw Metric | Normalization | Rationale |
|--------|-----------|---------------|-----------|
| GPU Supply | Price/hr (inverse) | Percentile rank, inverted | Robust to outlier prices. Lower price = more supply = higher score. |
| Energy | TWh generation | Min-max per-capita | Absolute generation matters for DC viability, adjusted for population. |
| CapEx Growth | YoY % change | Percentile rank, capped at 100th pctl | Growth rate matters, but extreme outliers distort. Winsorize at 95th. |
| Risk | Composite risk score (0-1) | Linear inversion (1 - risk) | Simple mapping: risk 0 = score 100. |

### Confidence Propagation

Each data point arrives with a confidence score (1-5) from its source layer:

| Source Layer | Base Confidence | Notes |
|-------------|----------------|-------|
| Structured API (Layer 1) | 4-5 | Direct from authoritative source |
| RSS + Rules (Layer 2) | 2-3 | Parsing may have errors |
| LLM Extraction (Layer 3) | 2-4 | Depends on prompt quality and source clarity |
| Manual Curation (Layer 4) | 5 | Human verified, but may be stale |

Confidence flows upward: entity-level confidence is the weighted average of its constituent data point confidences, weighted by factor importance.

### Time-Series Storage

```
data/index/history/
├── country/
│   ├── US.json     # { entityId, metric, series: [{ ts, value, confidence }] }
│   ├── CN.json
│   └── ...
├── city/
│   ├── sf.json
│   └── ...
├── cloud-region/
│   ├── us-east-1.json
│   └── ...
└── company/
    ├── nvidia.json
    └── ...
```

Each file contains the last 90 days of data points (at 4 entries/day = 360 entries per file, ~5KB each). Older entries are trimmed on each run.

### Incremental Update Flow

```
1. Read data/state.json
2. For each DataSource:
   a. Check schedule: is nextDue <= now?
   b. If stale, run fetch() -> write to data/raw/{source}/{date}.json
   c. Run normalize() -> write/merge to data/normalized/{source}.json
   d. Update state.json with new lastFetched
3. For each entity affected by changed sources:
   a. Read last computed factor scores from state
   b. Replace only the changed factors
   c. Recompute composite index
   d. Append to history file
   e. Update state.json with new lastComputed
4. Regenerate overview.json and rankings.json from all entity current scores
5. Compile: copy data/index/* to public/data/
6. Commit with git-auto-commit-action
```

## Scalability Considerations

| Concern | At 10 Countries (MVP) | At 50 Countries | At 100+ Entities |
|---------|----------------------|-----------------|------------------|
| **Data file size** | ~500KB total | ~2MB total | ~5MB total |
| **Compute time** | < 1 minute | < 3 minutes | < 10 minutes |
| **Frontend load** | ~70KB initial | ~70KB initial (lazy load rest) | ~80KB initial |
| **History storage** | ~50KB per country, ~500KB total | ~2.5MB total | ~10MB total |
| **Repo size (data)** | < 5MB | < 20MB | < 50MB |
| **API calls per run** | ~15 scrapers | ~30 scrapers | ~50 scrapers |

All targets stay well within GitHub Pages and Actions limits at 100+ entities. The per-entity file strategy means scaling to more entities adds files but does not increase any individual file size.

## Build Order (Dependency Graph)

```
Hard dependencies (→ means "must exist before"):

1. Project Skeleton (Vite + TS + directory structure)
   ├── 2. Scraper types + registry
   │   ├── 3. Shared lib (fetch-with-retry, throttle, logger)
   │   │   ├── 4a. AWS pricing scraper (Layer 1, most data)
   │   │   ├── 4b. Azure pricing scraper (Layer 1)
   │   │   ├── 4c. OWID energy scraper (Layer 1)
   │   │   ├── 4d. World Bank scraper (Layer 1)
   │   │   └── 4e. SEC EDGAR scraper (Layer 1)
   │   └── 5. Normalizers (depends on raw data existing)
   ├── 6. Index model + compute (depends on normalized data)
   │   ├── 7. State management (depends on compute logic)
   │   └── 8. Data compiler (depends on index output)
   ├── 9. LLM extraction (Layer 3, depends on types only)
   ├── 10. News RSS scraper (Layer 2, depends on types only)
   └── 11. Frontend app (depends on public/data/ structure)
       ├── 11a. Overview page + heatmap (loads overview.json)
       ├── 11b. Rankings page (loads rankings.json)
       ├── 11c. Entity detail page (loads per-entity history)
       └── 11d. Trend charts (loads history data)

Optimal build sequence:
  Phase 1: 1 → 2 → 3 → 4a (end-to-end with one data source)
  Phase 2: 4b-4e (additional structured sources) → 5 → 6 → 7 → 8
  Phase 3: 9 → 10 (unstructured sources, can parallel with frontend)
  Phase 4: 11a → 11b → 11c → 11d (frontend visualization)
```

**Key insight for build ordering:** Get one scraper (AWS pricing) end-to-end through the full pipeline (scraper → normalizer → index model → static JSON → frontend rendering) before building additional scrapers. This validates the entire architecture early and exposes integration issues when the codebase is small.

## Sources

- GitHub Actions billing and limits: [docs.github.com/en/billing](https://docs.github.com/en/billing/managing-billing-for-github-actions)
- GitHub Pages limits: [docs.github.com/en/pages](https://docs.github.com/en/pages)
- Vite build configuration: Context7 `/vitejs/vite`
- MapLibre GL JS: Context7 `/maplibre/maplibre-gl-js`
- Project context: `/Users/yiwei/ics/iait/.planning/PROJECT.md`
- Architecture seed notes: `/Users/yiwei/ics/iait/.planning/notes/compute-atlas-architecture.md`
- LLM pipeline seed: `/Users/yiwei/ics/iait/.planning/seeds/llm-news-extraction-pipeline.md`
- Pending tasks: `/Users/yiwei/ics/iait/.planning/todos/pending/`

**Confidence notes:**
- GitHub Actions limits (free tier minutes, timeout): MEDIUM -- values from training data, should verify against current docs
- GitHub Pages file/bandwidth limits: MEDIUM -- same caveat
- Scraper API endpoints (AWS pricing, Azure retail, SEC EDGAR): HIGH -- from project todo files, endpoints documented
- Index computation methodology: HIGH -- based on established financial index construction practices
- React Router HashRouter on GitHub Pages: HIGH -- well-documented pattern, widely used
