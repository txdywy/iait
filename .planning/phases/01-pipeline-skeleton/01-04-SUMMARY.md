---
phase: 01-pipeline-skeleton
plan: 04
subsystem: pipeline
tags: [typescript, compiler, orchestrator, vitest, pipeline, static-json]

# Dependency graph
requires:
  - phase: 01-pipeline-skeleton/01-01
    provides: Project scaffold with tsconfig, vitest, package.json
  - phase: 01-pipeline-skeleton/01-02
    provides: Scraper registry, content hash, fetch-with-retry utilities
  - phase: 01-pipeline-skeleton/01-03
    provides: AWS GPU pricing scraper and Signature V4 signer
provides:
  - Data compiler producing latest.json, rankings.json, history.json
  - Pipeline orchestration entry point with incremental hash-based writes
  - Entity directory scaffolding for all 4 entity types
  - Orchestrator tests covering groupByEntity, writeEntityIfChanged, full flow
affects: [frontend, data-automation, ci-cd]

# Tech tracking
tech-stack:
  added: []
  patterns: [recursive-file-scan, incremental-hash-write, aggregate-compilation]

key-files:
  created:
    - scripts/compiler.ts
    - scripts/run-pipeline.ts
    - scripts/__tests__/orchestrator.test.ts
    - public/data/entities/country/.gitkeep
    - public/data/entities/city/.gitkeep
    - public/data/entities/cloud-region/.gitkeep
    - public/data/entities/company/.gitkeep
  modified: []

key-decisions:
  - "writeEntityIfChanged accepts optional dataDir parameter for test isolation"
  - "Entity file recursive scan uses fs.readdir instead of glob to avoid extra dependency"
  - "Compiler JSDoc comments with curly braces replaced with plain comments to avoid OXC parser errors"

patterns-established:
  - "Compiler reads entity files recursively, writes 3 aggregate outputs"
  - "Pipeline orchestrator: discover -> fetch -> groupByEntity -> hash-check -> compile -> metadata"
  - "writeEntityIfChanged skips file write when SHA-256 hash matches existing metadata"

requirements-completed: [PIPE-08, PIPE-09, PIPE-10]

# Metrics
duration: 5min
completed: 2026-05-06
---

# Phase 1 Plan 4: Data Compiler and Pipeline Orchestrator Summary

**Data compiler producing latest.json/rankings.json/history.json with pipeline orchestrator using incremental SHA-256 hash-based entity file writes**

## Performance

- **Duration:** 5 min
- **Started:** 2026-05-06T12:24:44Z
- **Completed:** 2026-05-06T12:29:35Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- Data compiler reads all entity JSON files and produces three aggregate outputs: latest.json (entity snapshots), rankings.json (score-sorted by type), history.json (time-series)
- Pipeline orchestrator ties full pipeline together: discovers scrapers, fetches data, groups by entity, performs incremental hash checks, writes changed entities, compiles outputs, tracks metadata
- Orchestrator tests validate groupByEntity grouping, writeEntityIfChanged hash logic (skip on match, write on mismatch), and full pipeline flow with mocked scrapers
- Entity directory scaffolding created for all 4 types (country, city, cloud-region, company)

## Task Commits

1. **Task 1: Entity directory scaffolding** - `cf46ae6` (chore)
2. **Task 2: Data compiler** - `e0146c2` (feat)
3. **Task 3: Pipeline orchestration entry point with tests** - `9091279` (feat)

## Files Created/Modified

- `scripts/compiler.ts` - Reads entity files recursively, writes latest.json, rankings.json, history.json
- `scripts/run-pipeline.ts` - Pipeline entry point orchestrating discover, fetch, hash-check, compile, metadata
- `scripts/__tests__/orchestrator.test.ts` - Tests for groupByEntity, writeEntityIfChanged, full pipeline flow
- `public/data/entities/country/.gitkeep` - Directory scaffolding for country entities
- `public/data/entities/city/.gitkeep` - Directory scaffolding for city entities
- `public/data/entities/cloud-region/.gitkeep` - Directory scaffolding for cloud-region entities
- `public/data/entities/company/.gitkeep` - Directory scaffolding for company entities

## Decisions Made

- writeEntityIfChanged accepts optional dataDir parameter (default: 'public/data') to enable test isolation via os.tmpdir()
- Entity file recursive scan uses fs.readdir with { recursive: true } instead of the glob package (already installed), keeping the compiler dependency-free
- Compiler JSDoc comments with {dataDir} curly-brace patterns replaced with plain comments to avoid Vite OXC parser errors

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] JSDoc curly braces cause OXC parse error**
- **Found during:** Task 2 (Data compiler)
- **Issue:** JSDoc comments containing `{dataDir}` and `**/*.json` patterns caused Vite OXC transformer to fail with "Unexpected token" parse errors
- **Fix:** Replaced JSDoc comments with plain line comments; curly braces in JSDoc are interpreted as JSX expressions by OXC
- **Files modified:** scripts/compiler.ts
- **Verification:** All 3 compiler tests pass after fix
- **Committed in:** e0146c2 (Task 2 commit)

**2. [Rule 2 - Missing Critical] Test isolation for writeEntityIfChanged**
- **Found during:** Task 3 (Pipeline orchestration)
- **Issue:** Plan's writeEntityIfChanged used module-level DATA_DIR constant, causing tests to write to public/data/ during test runs
- **Fix:** Added optional dataDir parameter to writeEntityIfChanged (5th parameter), allowing tests to use tmpDir for full isolation
- **Files modified:** scripts/run-pipeline.ts, scripts/__tests__/orchestrator.test.ts
- **Verification:** Orchestrator tests pass using os.tmpdir() for all file writes
- **Committed in:** 9091279 (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 missing critical)
**Impact on plan:** Both deviations are necessary for correctness and test isolation. No scope creep.

## Issues Encountered

None beyond the deviations documented above.

## Known Stubs

None. All outputs are functional and will produce real data when scrapers provide records.

## Threat Flags

No new security surface beyond what is documented in the plan's threat model. The compiler reads from trusted local entity files and the orchestrator uses SHA-256 for change detection, both within accepted threat dispositions.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Pipeline is fully runnable via `pnpm run pipeline` once scrapers are registered
- Compiler produces latest.json, rankings.json, history.json for Phase 3 frontend consumption
- Entity directory structure ready for all entity types
- Phase 2 can add new scrapers by implementing the Scraper interface and dropping files in scripts/scrapers/

---
*Phase: 01-pipeline-skeleton*
*Completed: 2026-05-06*
