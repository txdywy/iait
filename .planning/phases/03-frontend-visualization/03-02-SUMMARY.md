---
phase: 03-frontend-visualization
plan: 02
subsystem: static-data-contracts
tags: [react-query, vite, static-json, typescript, vitest]

requires:
  - phase: 03-frontend-visualization
    plan: 01
    provides: "React/Vite frontend scaffold, Vitest jsdom setup, and React Query dependency"
provides:
  - "Frontend-safe contracts for Phase 2 aggregate JSON outputs"
  - "Derived data-center-cluster proxy node contract for FE-02 drill-down/detail routing"
  - "Base-path-safe static JSON fetch helper using import.meta.env.BASE_URL"
  - "React Query hooks and stable query keys for public static data assets"
affects: [03-frontend-visualization, FE-02, FE-09]

tech-stack:
  added: []
  patterns:
    - "Use import.meta.env.BASE_URL for all browser static asset fetches"
    - "Keep authoritative scoring in pipeline outputs and consume typed aggregate JSON in the frontend"
    - "Treat data-center-cluster as a derived frontend route/detail level, not a Phase 2 pipeline entity type"

key-files:
  created:
    - src/data/types.ts
    - src/data/static-json.ts
    - src/data/queries.ts
    - src/data/static-json.test.ts
  modified: []

key-decisions:
  - "Modeled data-center-cluster as a frontend-only EntityLevel extension so FE-02 can route to derived cluster proxies without requiring real aggregate entity records."
  - "Made per-entity source summary queries return an explicit unavailable state with an empty source list for missing 404 files, preserving detail UI stability while keeping other fetch errors visible."

patterns-established:
  - "Static data modules expose path constants and query keys alongside React Query hooks."
  - "Fetch helpers throw descriptive Failed to load <path>: <status> errors for non-OK static responses."

requirements-completed: [FE-02, FE-09]

duration: 4 min
completed: 2026-05-07
---

# Phase 03 Plan 02: Static JSON Contract Layer Summary

**Base-path-safe static JSON contracts and React Query hooks for aggregate data, crossrefs, geography, and derived cluster drill-downs**

## Performance

- **Duration:** 4 min
- **Started:** 2026-05-07T09:25:52Z
- **Completed:** 2026-05-07T09:30:45Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Added frontend-safe TypeScript contracts mirroring Phase 2 compiler aggregate outputs: latest index, rankings, history, index config, entity files, and cross-reference mappings.
- Added `EntityLevel` and `DerivedClusterNode` support for the frontend-only `data-center-cluster` terminal level required by FE-02 drill-down/detail flows.
- Added `dataUrl` and `fetchStaticJson` helpers that resolve public assets through `import.meta.env.BASE_URL` and throw explicit static fetch errors.
- Added React Query query keys and hooks for `latest.json`, `rankings.json`, `history.json`, `index-config.json`, `entity-crossref.json`, country geometry, and per-entity source summaries.
- Added Vitest coverage for base URL behavior, fetch success/error handling, query key paths, and derived cluster type affordances.

## Task Commits

Each task was committed atomically using RED/GREEN TDD commits:

1. **Task 1 RED: Create frontend-safe types including derived cluster contract** - `46c7d75` (`test(03-02): add failing cluster contract tests`)
2. **Task 1 GREEN: Create frontend-safe types including derived cluster contract** - `e4f3d87` (`feat(03-02): add frontend static data types`)
3. **Task 2 RED: Create base-path-safe fetcher and React Query hooks** - `461c2e2` (`test(03-02): add failing static JSON query tests`)
4. **Task 2 GREEN: Create base-path-safe fetcher and React Query hooks** - `1cb4669` (`feat(03-02): add static JSON query layer`)

**Plan metadata:** committed after this summary is written.

## Files Created/Modified

- `src/data/types.ts` - Frontend-safe static data contracts, aggregate output interfaces, entity level union, and derived cluster node contract.
- `src/data/static-json.ts` - Vite base-path-safe data URL builder and typed JSON fetch helper with explicit non-OK errors.
- `src/data/queries.ts` - Static data path constants, React Query keys, aggregate/crossref/geo hooks, and unavailable-state per-entity source summaries.
- `src/data/static-json.test.ts` - TDD tests for cluster contracts, base URL handling, fetch success/error behavior, and query key coverage.

## Decisions Made

- Modeled `data-center-cluster` as a derived frontend `EntityLevel` rather than adding it to the pipeline `EntityType`, matching the research resolution that cluster nodes are modeled proxies and not verified facility entities.
- Returned `{ available: false, state: 'unavailable', sources: [] }` only for 404 per-entity source files so detail UI can render a stable empty state while non-404/network failures still surface through React Query errors.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Used Vitest's supported CLI invocation instead of the plan's `-x` flag**
- **Found during:** Task 1 and Task 2 verification
- **Issue:** `npm test -- src/data/static-json.test.ts -x` failed because Vitest 4.1.5 reports `Unknown option -x`.
- **Fix:** Ran the same targeted test file without `-x`: `npm test -- src/data/static-json.test.ts`.
- **Files modified:** None
- **Verification:** Targeted test command passed with 6 tests.
- **Committed in:** N/A, command-only deviation

**2. [Rule 1 - Bug] Fixed TypeScript test literals to use the frontend EntityType enum**
- **Found during:** Plan-level typecheck
- **Issue:** Tests used raw string literals where `EntityLevel`/query key helpers accepted the enum-backed `EntityType`, causing TypeScript errors despite runtime tests passing.
- **Fix:** Imported `EntityType` in the test and used enum members for pipeline entity levels and query key inputs.
- **Files modified:** `src/data/static-json.test.ts`
- **Verification:** `npm test -- src/data/static-json.test.ts`, `npm run typecheck`, and `npm run build` all passed.
- **Committed in:** `1cb4669` (Task 2 GREEN commit)

---

**Total deviations:** 2 auto-fixed (1 blocking command compatibility, 1 bug)
**Impact on plan:** Both fixes were necessary to verify the intended scoped implementation. No additional source files or data assets were introduced.

## Issues Encountered

- Context7 CLI lookup for React Query documentation failed with `fetch failed`; the implementation followed the plan's extracted React Query v5 pattern and the already installed project dependency.
- The plan's `-x` test flag is not accepted by the installed Vitest version; targeted test verification succeeded without that flag.

## Verification

- `npm test -- src/data/static-json.test.ts` - passed (6 tests)
- `npm run typecheck` - passed
- `npm run build` - passed

## Acceptance Criteria Results

Task 1:
- `grep -v '^#' src/data/types.ts | grep -c "'data-center-cluster'"` - `2` (pass)
- `grep -v '^#' src/data/types.ts | grep -c 'DerivedClusterNode'` - `1` (pass)
- `grep -v '^#' src/data/types.ts | grep -c 'parentCloudRegionId'` - `1` (pass)

Task 2:
- `grep -v '^#' src/data/static-json.ts | grep -c 'import.meta.env.BASE_URL'` - `1` (pass)
- `grep -v '^#' src/data/static-json.ts | grep -c 'Failed to load'` - `1` (pass)
- `grep -v '^#' src/data/static-json.ts | grep -c 'node:fs'` - `0` (pass)
- `grep -v '^#' src/data/queries.ts | grep -c 'data/latest.json'` - `1` (pass)
- `grep -v '^#' src/data/queries.ts | grep -c 'data/entity-crossref.json'` - `1` (pass)
- `grep -v '^#' src/data/queries.ts | grep -c 'data/entities'` - `1` (pass)

## Known Stubs

None. The empty source list in `useEntitySourceSummary` is an intentional unavailable-state fallback for missing per-entity static files, not a UI stub.

## Threat Flags

None. The plan introduced browser fetches for public static assets already listed in the threat model and added no secrets, auth paths, backend endpoints, or new file access outside static asset URLs.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 03-03 can generate/copy the actual public data and geography assets that these typed hooks reference. Plans 03-04 through 03-06 can consume the shared contracts and query keys for map, ranking, detail, and chart UI work.

## Self-Check: PASSED

- Found `src/data/types.ts`, `src/data/static-json.ts`, `src/data/queries.ts`, and `src/data/static-json.test.ts`.
- Found task commits `46c7d75`, `e4f3d87`, `461c2e2`, and `1cb4669` in git history.
- Stub scan found no TODO/FIXME/placeholder/coming-soon/not-available patterns in created source files.
- No shared orchestrator artifacts (`STATE.md`, `ROADMAP.md`) were modified.

---
*Phase: 03-frontend-visualization*
*Completed: 2026-05-07*
