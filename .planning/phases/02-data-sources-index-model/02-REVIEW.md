---
phase: 02-data-sources-index-model
reviewed: 2026-05-06T17:10:45Z
depth: standard
files_reviewed: 18
files_reviewed_list:
  - scripts/__tests__/azure-gpu-pricing.test.ts
  - scripts/__tests__/compiler.test.ts
  - scripts/__tests__/fixtures/azure-api-response.json
  - scripts/__tests__/fixtures/owid-energy-sample.csv
  - scripts/__tests__/fixtures/sec-edgar-companyfacts.json
  - scripts/__tests__/fixtures/world-bank-response.json
  - scripts/__tests__/index-model.test.ts
  - scripts/__tests__/orchestrator.test.ts
  - scripts/__tests__/owid-energy.test.ts
  - scripts/__tests__/sec-edgar-capex.test.ts
  - scripts/__tests__/world-bank-energy.test.ts
  - scripts/compiler.ts
  - scripts/index-model.ts
  - scripts/run-pipeline.ts
  - scripts/scrapers/azure-gpu-pricing.ts
  - scripts/scrapers/owid-energy.ts
  - scripts/scrapers/sec-edgar-capex.ts
  - scripts/scrapers/world-bank-energy.ts
findings:
  critical: 4
  warning: 3
  info: 0
  total: 7
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-05-06T17:10:45Z
**Depth:** standard
**Files Reviewed:** 18
**Status:** issues_found

## Summary

Reviewed the data scrapers, pipeline orchestration, compiler, index model, and associated tests/fixtures for Phase 02. The submitted implementation has multiple correctness defects in the index calculation path: distinct energy metrics are collapsed into a single factor and overwrite each other, SEC quarterly CapEx is double-counted, GPU pricing records are reduced to an arbitrary SKU, and history output is overwritten on every compile. These affect core project data products and should be fixed before shipping.

## Critical Issues

### CR-01: BLOCKER - Energy capacity is overwritten by unrelated same-date metrics

**File:** `scripts/index-model.ts:3-10`, `scripts/index-model.ts:26-39`

**Issue:** `primary-energy-consumption`, `electricity-generation`, `electricity-production`, `electricity-per-capita`, and `renewables-share-elec` all map to `energy_capacity`. `computeFactors()` then keeps only one latest record per factor. OWID emits multiple metrics for the same country/year in metric order; because line 31 accepts `record.timestamp >= existing.timestamp`, the same-year `renewables-share-elec` percentage can overwrite TWh generation/consumption. A country can therefore get an `energy_capacity` of `21.3` percent instead of `4178.2` TWh, corrupting composite scores.

**Fix:** Do not map incompatible units into the same factor, and use deterministic metric priority when multiple metrics can contribute to one factor. For example:

```ts
const METRIC_TO_FACTOR: Record<string, string> = {
  'primary-energy-consumption': 'energy_capacity',
  'electricity-generation': 'energy_capacity',
  'electricity-production': 'energy_capacity',
  'electricity-per-capita': 'energy_intensity',
  'renewables-share-elec': 'clean_energy_share',
  'gpu-price-hr': 'gpu_supply',
  'ai-capex-ttm': 'ai_capex',
};

const ENERGY_PRIORITY: Record<string, number> = {
  'electricity-generation': 3,
  'electricity-production': 2,
  'primary-energy-consumption': 1,
};
```

When choosing an `energy_capacity` record, compare by timestamp first and then by `ENERGY_PRIORITY`, not by arbitrary series order.

### CR-02: BLOCKER - SEC quarterly TTM CapEx calculation double-counts cumulative filings

**File:** `scripts/scrapers/sec-edgar-capex.ts:77-81`

**Issue:** When the latest filing is a `10-Q`, `computeTTM()` sums `sorted.slice(0, 4)` across facts. SEC cash-flow CapEx facts are commonly year-to-date cumulative values, not standalone quarterly values. This double-counts Q1/Q2/Q3, and the fourth item can even be a prior-year `10-K`, mixing annual and quarterly periods. The resulting `ai-capex-ttm` is materially wrong for the company factor.

**Fix:** Convert cumulative quarterly facts into standalone quarter increments before summing, and do not include a 10-K as a fourth quarter. If reliable quarter derivation is unavailable, fall back to the latest annual 10-K instead of inventing TTM:

```ts
private computeTTM(facts: XBRLFact[]): number | null {
  const valid = facts
    .filter(f => (f.form === '10-K' || f.form === '10-Q') && Number.isFinite(f.val))
    .sort((a, b) => b.end.localeCompare(a.end));

  const latestAnnual = valid.find(f => f.form === '10-K');
  const latest = valid[0];
  if (!latest) return null;
  if (latest.form === '10-K') return Math.abs(latest.val);

  const quarters = deriveStandaloneQuarterValues(valid.filter(f => f.form === '10-Q'));
  return quarters.length >= 4
    ? quarters.slice(0, 4).reduce((sum, value) => sum + Math.abs(value), 0)
    : latestAnnual ? Math.abs(latestAnnual.val) : null;
}
```

Add tests with cumulative Q1/Q2/Q3 values to prove the TTM calculation does not double-count.

### CR-03: BLOCKER - Compiling destroys previously generated history

**File:** `scripts/compiler.ts:275-298`

**Issue:** `writeHistory()` builds a new `history` object containing exactly one snapshot per current entity and writes it directly to `history.json`. It never reads the existing file or appends to prior series. Every pipeline run therefore discards historical score snapshots, which is data loss for a project whose core value is trend signals.

**Fix:** Load existing history when present, append the new snapshot for each entity, and retain prior series entries:

```ts
async function writeHistory(scoredEntities: Map<string, ScoredEntity>, dataDir: string): Promise<void> {
  const historyPath = path.join(dataDir, 'history.json');
  const history = await loadOptionalJson<typeof initialHistory>(historyPath, {});

  for (const [id, scored] of scoredEntities) {
    const existing = history[id]?.series ?? [];
    history[id] = {
      type: scored.entity.type,
      name: scored.entity.latest.entity.name,
      series: [
        ...existing,
        { timestamp: new Date().toISOString(), score: scored.score, factors: scored.factors },
      ],
    };
  }

  await fs.writeFile(historyPath, JSON.stringify(history, null, 2));
}
```

Also add a compiler test that seeds an existing `history.json`, runs `compile()`, and verifies the old snapshot remains.

### CR-04: BLOCKER - GPU supply is based on an arbitrary last SKU price per region

**File:** `scripts/scrapers/azure-gpu-pricing.ts:40-44`, `scripts/index-model.ts:24-39`

**Issue:** The Azure scraper emits one `gpu-price-hr` record per SKU/region. `computeFactors()` then collapses all records with the same metric/factor to one value by timestamp, so a cloud region's `gpu_supply` becomes the inverse price of whichever SKU happened to be normalized last. This is not a stable or meaningful regional GPU supply signal, and changes with API item ordering or scrape timing.

**Fix:** Preserve SKU identity or aggregate intentionally before scoring. For example, add SKU metadata/metric IDs and compute a deterministic regional metric such as minimum on-demand GPU hourly price, median GPU price, or SKU count:

```ts
const gpuPrices = entity.series
  .filter(record => record.metric === 'gpu-price-hr' && Number.isFinite(record.value) && record.value > 0)
  .map(record => record.value);

if (gpuPrices.length > 0) {
  const minPrice = Math.min(...gpuPrices);
  factors.gpu_supply = 1 / minPrice;
}
```

Then add tests with multiple GPU prices for the same region to assert the selected aggregation rule.

## Warnings

### WR-01: WARNING - Source timestamps are replaced with current run time, breaking incremental hashes and chronology

**File:** `scripts/scrapers/azure-gpu-pricing.ts:90`, `scripts/scrapers/sec-edgar-capex.ts:101`, `scripts/run-pipeline.ts:37-42`

**Issue:** Azure and SEC records use `new Date().toISOString()` instead of source dates (`effectiveStartDate`, filing `end`/`filed`). Since `hashRecords()` includes the timestamp, unchanged upstream values hash differently on every run. `writeEntityIfChanged()` will rewrite data even when the source data did not change, and time series timestamps reflect scrape time rather than the period the measurement describes.

**Fix:** Use stable source timestamps in normalized records. Azure should use `item.effectiveStartDate`; SEC should return the selected filing period/date from `computeTTM()` and use that in `normalize()`:

```ts
timestamp: item.effectiveStartDate,
```

and for SEC, return `{ value, timestamp }` from the TTM computation instead of only `number`.

### WR-02: WARNING - Equal-value percentile ranking inflates non-distinguishing factors to 100

**File:** `scripts/index-model.ts:13-16`, `scripts/__tests__/index-model.test.ts:98-100`

**Issue:** `percentileRank(5, [5, 5, 5])` returns `100`, and the test description says this is a neutral score while asserting `100`. When all entities have the same factor value, the factor provides no differentiation and should not max out every entity's score.

**Fix:** Return a neutral score when all comparison values are identical, and update the test assertion:

```ts
export function percentileRank(value: number, allValues: number[]): number {
  if (allValues.length <= 1) return 50;
  if (allValues.every(v => v === allValues[0])) return 50;
  const count = allValues.filter(v => v <= value).length;
  return (count / allValues.length) * 100;
}
```

### WR-03: WARNING - Pipeline metadata read failures are silently treated as empty metadata

**File:** `scripts/run-pipeline.ts:11-17`

**Issue:** `loadMeta()` catches every error and returns an empty metadata object. A malformed JSON file, permission problem, or partial write is indistinguishable from a missing file; the next successful run can overwrite metadata and lose existing hash/update tracking.

**Fix:** Only tolerate `ENOENT`. For parse and permission errors, throw so the pipeline fails loudly and preserves the existing file for investigation:

```ts
export async function loadMeta(metaPath = META_PATH): Promise<PipelineMeta> {
  try {
    const raw = await fs.readFile(metaPath, 'utf-8');
    return JSON.parse(raw) as PipelineMeta;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return { lastRun: '', entities: {} };
    }
    throw err;
  }
}
```

---

_Reviewed: 2026-05-06T17:10:45Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
