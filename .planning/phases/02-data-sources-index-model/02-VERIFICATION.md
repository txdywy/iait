---
phase: 02-data-sources-index-model
verified: 2026-05-06T18:00:23Z
status: human_needed
score: 12/12 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Run the full data pipeline against live Azure, OWID, World Bank, and SEC EDGAR endpoints with SEC_EDGAR_EMAIL configured."
    expected: "Pipeline completes, writes merged entity files, and compiles latest.json/rankings.json/history.json without external API shape or rate-limit failures."
    why_human: "External service integration and live network behavior cannot be conclusively verified from mocked tests and static code inspection."
---

# Phase 2: Data Sources + Index Model Verification Report

**Phase Goal:** Complete compute index covering all data sources with configurable scoring, confidence levels, and risk adjustment  
**Verified:** 2026-05-06T18:00:23Z  
**Status:** human_needed  
**Re-verification:** No previous `02-VERIFICATION.md` existed in the phase directory; this is an initial final verification with explicit focus on the prior SEC EDGAR latest-quarter TTM gap.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Pipeline scrapes Azure GPU pricing, OWID energy data, World Bank energy indicators, and SEC EDGAR CapEx for 5 companies | VERIFIED | Azure, OWID, World Bank, and SEC scraper files all exist with `readonly source = DataSourceLayer.STRUCTURED_API` and `export default new ...Scraper()`; registry glob auto-discovers `scripts/scrapers/*.ts`; full suite passed: 12 files / 68 tests. |
| 2 | SEC EDGAR scraper computes TTM correctly when latest filing is Q1/Q2/Q3 cumulative 10-Q using current YTD + prior annual remainder | VERIFIED | `scripts/scrapers/sec-edgar-capex.ts` computes `currentYtd + (priorAnnual - priorSameQuarter)` when prior same quarter and prior annual exist. Regression test `computes TTM from latest Q3 cumulative filing plus prior annual remainder` expects `1,450,000,000`, not annual fallback `1,069,000,000`, and `npx vitest run scripts/__tests__/sec-edgar-capex.test.ts` passed 6/6. |
| 3 | Every scraper is wired for default-export registry auto-discovery | VERIFIED | `scripts/registry.ts` glob-imports scraper files and registers default exports with `name` and `fetch`; new scrapers each default-export an instance. |
| 4 | Data points carry confidence scores based on source reliability | VERIFIED | Structured scrapers normalize records with `confidence: 5`; manual seed cloud-region files use confidence 4; index confidence calculation applies missing-factor and staleness penalties with min floor. |
| 5 | MVP scope covers 10 countries, 20 cities, 5 cloud providers, and 5 companies | VERIFIED | Config validation command reported 10 countries, 20 cities, providers `[aws, azure, gcp, ibm, oracle]`, and 5 companies in `scripts/mappings/entity-crossref.json`. |
| 6 | Composite formula combines GPU_Supply, Energy_Capacity, Cloud_Region_Density, AI_CapEx, and Risk_Adjustment into a single score | VERIFIED | `scripts/index-model.ts` maps source metrics to factors and `computeCompositeScore()` computes weighted normalized sum multiplied by risk multiplier; compiler calls it for each entity. |
| 7 | Each factor is normalized to 0-100 via percentile ranking within entity type | VERIFIED | `percentileRank()` and `normalizeFactors()` exist in `scripts/index-model.ts`; `normalizeFactors()` filters by `EntityType` before computing per-factor rankings; index-model tests cover type-separated normalization. |
| 8 | Factor weights are configurable in JSON without code changes | VERIFIED | `public/data/index-config.json` contains 5 factors and weights summing to 1.0; compiler loads it via `loadJsonFile<IndexConfig>(path.join(dataDir, 'index-config.json'))`. |
| 9 | Sparse data degrades gracefully with proportional re-weighting and confidence penalty | VERIFIED | `computeCompositeScore()` divides by `presentWeight` and returns 0 only when no factors exist; `computeConfidence()` penalizes missing factors and stale records and floors at configured `minConfidence`. |
| 10 | Export control risk adjustment applies country-tier lookup table to index scores | VERIFIED | `scripts/mappings/export-control-tiers.json` has unrestricted=1.0, restricted=0.7, sanctioned=0.3 with `in` restricted and `cn` sanctioned; compiler calls `riskForEntity()` and passes `riskMultiplier` into `computeCompositeScore()`. |
| 11 | Cloud regions roll up to parent countries and cities | VERIFIED | `aggregateToCountries()` and `aggregateToCities()` compute GPU supply averages and density; compiler creates virtual country/city entities when source entity files do not exist; tests cover city rollups and source timestamp freshness. |
| 12 | Pipeline merges multi-source records into unified entity files before compiling | VERIFIED | `scripts/run-pipeline.ts` collects all scraper records into `allRecords` by entity, writes each merged entity once, then calls `compile(DATA_DIR)`; orchestrator tests cover multi-source merging. |

**Score:** 12/12 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `scripts/scrapers/azure-gpu-pricing.ts` | Azure Retail Prices API scraper for NC/ND/NV GPU families | VERIFIED | Contains endpoint, GPU prefixes, pagination via `NextPageLink`, primary-meter filtering, default export. |
| `scripts/scrapers/owid-energy.ts` | OWID CSV scraper using crossref mappings | VERIFIED | Fetches GitHub raw CSV, loads `entity-crossref.json`, emits country energy metrics. |
| `scripts/scrapers/world-bank-energy.ts` | World Bank energy indicator scraper | VERIFIED | Fetches `EG.USE.ELEC.KH.PC` and `EG.ELC.PROD.KH`, loads ISO mappings from crossref, skips malformed/null data. |
| `scripts/scrapers/sec-edgar-capex.ts` | SEC EDGAR CapEx scraper with TTM derivation | VERIFIED | Fetches XBRL companyconcept data for 5 CIKs, sets `User-Agent`, rate-delay option, computes latest-quarter TTM correctly. |
| `scripts/index-model.ts` | Pure composite index functions | VERIFIED | Exports factor extraction, normalization, composite scoring, confidence, country/city aggregation, and risk lookup. |
| `scripts/compiler.ts` | Composite score compiler integration | VERIFIED | Loads config/crossref/risk files, calls index-model functions, writes composite latest/rankings/history outputs. |
| `scripts/run-pipeline.ts` | Multi-source merge pipeline | VERIFIED | SDK artifact checker flagged missing literal `mergeEntities`, but manual verification confirms equivalent inline merge via `allRecords` before writes and compile. |
| `public/data/index-config.json` | Weights and confidence config | VERIFIED | 5 factors, weight sum 1.0, 6 confidence parameters. |
| `scripts/mappings/entity-crossref.json` | MVP cross-source mappings | VERIFIED | 10 countries, 20 cities, 5 cloud providers, 5 companies. |
| `scripts/mappings/export-control-tiers.json` | Risk tier multipliers and assignments | VERIFIED | Three tiers with required multipliers and country assignments. |
| Phase tests and fixtures | Regression and behavior coverage | VERIFIED | Full suite passed: 12 test files, 68 tests. SEC focused suite passed: 6 tests. |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `scripts/registry.ts` | `scripts/scrapers/*.ts` | glob import of scraper default exports | WIRED | Registry discovers all scraper files and registers default instances. |
| `scripts/scrapers/azure-gpu-pricing.ts` | Azure Retail Prices API | `fetchWithRetry()` | WIRED | Uses `https://prices.azure.com/api/retail/prices` and follows `NextPageLink`. |
| `scripts/scrapers/owid-energy.ts` | `entity-crossref.json` | startup mapping load | WIRED | No hardcoded entity map; reads crossref. |
| `scripts/scrapers/world-bank-energy.ts` | `entity-crossref.json` | startup ISO mapping load | WIRED | No hardcoded entity map; reads crossref. |
| `scripts/scrapers/sec-edgar-capex.ts` | SEC EDGAR API | `fetchWithRetry()` plus `SEC_EDGAR_EMAIL` User-Agent | WIRED | Uses SEC endpoint, XBRL tag, CIK list, `User-Agent`, and 100ms base delay. |
| `scripts/compiler.ts` | `scripts/index-model.ts` | import and direct function calls | WIRED | SDK key-link checker missed the multiline import pattern, but manual verification shows imports from `./index-model.js` and calls to scoring functions. |
| `scripts/compiler.ts` | `public/data/index-config.json` | `loadJsonFile<IndexConfig>` | WIRED | Compiler loads config before scoring. |
| `scripts/compiler.ts` | `scripts/mappings/export-control-tiers.json` | `loadJsonFile<ExportControlTiers>` | WIRED | Compiler loads risk tiers and passes them into `riskForEntity()`. |
| `scripts/run-pipeline.ts` | `scripts/compiler.ts` | `await compile(DATA_DIR)` after writes | WIRED | Compile occurs only after merged entity files are written, with empty-data guard preserved. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|---|---|---|---|---|
| `scripts/scrapers/sec-edgar-capex.ts` | `records[].value` / `ai-capex-ttm` | SEC `companyconcept` XBRL `units.USD` facts → `computeTTM()` → `normalize()` | Yes, from fetched XBRL facts; tests cover annual and latest-Q3 cumulative paths | FLOWING |
| `scripts/run-pipeline.ts` | `allRecords` | `discoverScrapers()` / `getScrapers()` → each `scraper.fetch()` | Yes, records are grouped by entity and written to entity files | FLOWING |
| `scripts/compiler.ts` | `scoredEntities` | entity JSON files + `index-config.json` + crossref + risk tiers | Yes, loaded entity files feed factor computation and compiled outputs | FLOWING |
| `scripts/index-model.ts` | normalized factors and scores | `EntityFile.series` and config weights | Yes, pure functions transform record series into factors, normalized values, confidence, and scores | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| SEC latest-quarter TTM regression | `npx vitest run scripts/__tests__/sec-edgar-capex.test.ts` | 1 file passed, 6 tests passed | PASS |
| Full scripts test suite | `npx vitest run` | 12 files passed, 68 tests passed | PASS |
| TypeScript scripts project | `npx tsc --noEmit -p tsconfig.scripts.json` | Exit 0, no output | PASS |
| Config and mapping counts | Node JSON validation command | 5 factors, weight sum 1, 10 countries, 20 cities, 5 providers, 5 companies, required tier multipliers | PASS |
| Artifact declarations | `gsd-sdk query verify.artifacts` on all four plans | 20/21 literal checks passed; one literal `mergeEntities` pattern missed but manual behavior verified inline | PASS_WITH_NOTE |
| Key links | `gsd-sdk query verify.key-links` on plans 02-03 and 02-04 | 7/8 literal checks passed; one multiline compiler import missed but manual wiring verified | PASS_WITH_NOTE |

### Requirements Coverage

`.planning/REQUIREMENTS.md` is not present in this worktree, so full requirement descriptions could not be cross-referenced from that file. Coverage below is mapped from the user-provided IDs, ROADMAP Phase 2 requirements, and plan frontmatter evidence.

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| PIPE-02 | 02-02 | Azure GPU pricing source | SATISFIED | Azure scraper exists, uses public API, tests pass. |
| PIPE-03 | 02-03 | OWID/World Bank energy sources | SATISFIED | OWID and World Bank scrapers exist, use crossref mappings, tests pass. |
| PIPE-04 | 02-03 | SEC EDGAR CapEx source | SATISFIED | SEC scraper exists, fetches 5 CIKs, TTM regression passes. |
| PIPE-05 | 02-01, 02-04 | Pipeline merge/config/compiler integration | SATISFIED | Pipeline merges records by entity, compiler integrates composite model. |
| INDX-01 | 02-04 | Composite score formula | SATISFIED | `computeCompositeScore()` implements weighted normalized score times risk multiplier. |
| INDX-02 | 02-04 | Percentile normalization and configurable weights | SATISFIED | `normalizeFactors()` and `index-config.json` verified. |
| INDX-03 | 02-01, 02-04 | Index configuration model | SATISFIED | `IndexConfig` type and config JSON verified. |
| INDX-04 | 02-02, 02-03, 02-04 | Data-source factors feed index | SATISFIED | GPU, energy, CapEx, density, and risk factor mappings verified. |
| INDX-05 | 02-04 | Confidence / sparse-data behavior | SATISFIED | Missing-factor and staleness penalties implemented and tested. |
| INDX-06 | 02-01, 02-04 | Export-control risk adjustment | SATISFIED | Tier JSON and `riskForEntity()` verified. |
| INDX-07 | 02-01, 02-04 | MVP geographic/provider coverage and rollups | SATISFIED | Crossref counts, seed entities, and country/city rollups verified. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---:|---|---|---|
| `scripts/scrapers/sec-edgar-capex.ts` | 70, 93, 103, 115, 132, 139 | `return null` | Info | Legitimate no-data / invalid-XBRL guard paths, not stubs; fetch loop skips null CapEx records. |
| `scripts/run-pipeline.ts` | 45, 68, 77, 113 | `console.log` | Info | Operational CLI logging, not console-only implementation. |

No blocker anti-patterns found. No TODO/FIXME/placeholder or empty implementation patterns were found in the core Phase 2 files scanned.

### Human Verification Required

#### 1. Live external API pipeline run

**Test:** Run the full data pipeline against live Azure, OWID, World Bank, and SEC EDGAR endpoints with `SEC_EDGAR_EMAIL` configured.  
**Expected:** Pipeline completes, writes merged entity files, and compiles `latest.json`, `rankings.json`, and `history.json` without API-shape or rate-limit failures.  
**Why human:** External service integration and live network behavior cannot be conclusively verified from mocked tests and static code inspection.

### Gaps Summary

No implementation gaps found. The prior SEC EDGAR latest-quarter TTM gap is closed: the code derives TTM for a latest Q3 cumulative 10-Q as current YTD plus prior annual remainder, and the regression test asserts `1,450,000,000` rather than falling back to the annual value.

Automated verification passes all must-haves. Status remains `human_needed` solely because live external API behavior requires a human/operational run.

---

_Verified: 2026-05-06T18:00:23Z_  
_Verifier: Claude (gsd-verifier)_
