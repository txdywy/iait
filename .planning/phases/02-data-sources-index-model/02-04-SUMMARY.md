---
phase: 02-data-sources-index-model
plan: 04
subsystem: data-pipeline
tags: [index-model, compiler, composite-score, percentile-ranking, pipeline, vitest]

requires:
  - phase: 02-data-sources-index-model
    provides: Plans 02-01 through 02-03 types, config, mappings, and source scrapers
provides:
  - Pure composite index model functions
  - Compiler output based on configurable composite scores
  - Country and city rollups from cloud-region GPU supply
  - Pipeline multi-source entity merging
  - Tests for scoring, compiler output, and pipeline merge behavior
affects: [dashboard, rankings, heatmap, country-index, city-index]

tech-stack:
  added: []
  patterns: [pure scoring functions, compiler score assembly, multi-source pipeline merge]

key-files:
  created:
    - scripts/index-model.ts
    - scripts/__tests__/index-model.test.ts
  modified:
    - scripts/compiler.ts
    - scripts/__tests__/compiler.test.ts
    - scripts/run-pipeline.ts
    - scripts/__tests__/orchestrator.test.ts

key-decisions:
  - "Index scoring is implemented as pure functions in scripts/index-model.ts so compiler I/O is separate from scoring semantics."
  - "Missing factors are re-weighted proportionally by present factor weight, then risk multiplier is applied."
  - "Cloud-region GPU supply rolls up to virtual country and city factors using entity-crossref.json."
  - "Pipeline now merges all scraper records by entity before writing entity files."

patterns-established:
  - "Composite scores are emitted through latest.json, rankings.json, and history.json with factorBreakdown metadata."
  - "Virtual city/country rollups can be compiled without separate entity source files."
  - "Pipeline writes entity files once per entity after all scrapers finish."

requirements-completed: [PIPE-05, INDX-01, INDX-02, INDX-03, INDX-04, INDX-05, INDX-06, INDX-07]

duration: resumed-inline
completed: 2026-05-07
---

# Phase 02: Composite Index Model Summary

**Composite compute index model with percentile-normalized factors, risk adjustment, compiler integration, and multi-source pipeline merging**

## Performance

- **Duration:** resumed inline
- **Started:** 2026-05-07
- **Completed:** 2026-05-07
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Added `scripts/index-model.ts` with percentile ranking, factor extraction, normalization, composite scoring, confidence scoring, country rollups, city rollups, and risk lookup.
- Upgraded compiler outputs to use composite index scores with `riskTier`, `riskMultiplier`, `factorBreakdown`, and `dataCompleteness` metadata.
- Added virtual country/city rollups from cloud-region data via `entity-crossref.json`.
- Changed pipeline orchestration to merge records from all scrapers by entity before writing entity files.
- Expanded tests to cover index model semantics, compiler output, ranking order, city rollups, timestamp sorting, and multi-source merging.

## Task Commits

Pending commit in resumed inline execution.

## Files Created/Modified

- `scripts/index-model.ts` - Pure composite index computation module.
- `scripts/__tests__/index-model.test.ts` - Unit tests for index model functions.
- `scripts/compiler.ts` - Compiler integration for composite scores and rollups.
- `scripts/__tests__/compiler.test.ts` - Compiler tests with index config and composite score assertions.
- `scripts/run-pipeline.ts` - Pipeline multi-source entity merge flow.
- `scripts/__tests__/orchestrator.test.ts` - Pipeline grouping, sorting, and merge behavior tests.

## Decisions Made

- Kept index model pure and dependency-free to make score semantics easy to test.
- Used percentile normalization within each entity type to avoid ranking cloud regions against countries or companies.
- Added virtual city entities during compilation because Phase 2 explicitly derives city entities from cloud-region rollups rather than separate source files.
- Preserved latest/rankings/history output schemas while enriching latest entities with composite metadata.

## Deviations from Plan

### Auto-fixed Issues

**1. [Design consistency] Added riskForEntity helper to centralize risk mapping**
- **Found during:** Task 1 (index-model implementation)
- **Issue:** Risk multipliers needed to resolve countries from cloud regions, companies, and cities consistently.
- **Fix:** Added `riskForEntity()` helper and tests for cloud-region country risk resolution.
- **Files modified:** `scripts/index-model.ts`, `scripts/__tests__/index-model.test.ts`
- **Verification:** `npx vitest run scripts/__tests__/index-model.test.ts` passes.

**2. [Integration] Compiler creates virtual city/country entities for rollups**
- **Found during:** Task 2 (compiler integration)
- **Issue:** City rollups have no source entity files, so compiler needed a representation for output records.
- **Fix:** Added internal virtual entity construction for derived rollups.
- **Files modified:** `scripts/compiler.ts`, `scripts/__tests__/compiler.test.ts`
- **Verification:** Compiler test verifies `ashburn` virtual city output.

---

**Total deviations:** 2 auto-fixed integration/design improvements
**Impact on plan:** Required to deliver planned country/city rollup behavior cleanly.

## Issues Encountered

None beyond the earlier background executor authentication failure; Wave 3 was completed inline.

## User Setup Required

None.

## Next Phase Readiness

Phase 2 now produces a real composite index data model suitable for dashboard rankings, heatmap layers, and entity drilldowns.

---
*Phase: 02-data-sources-index-model*
*Completed: 2026-05-07*
