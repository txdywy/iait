---
phase: 03-frontend-visualization
plan: 06
subsystem: frontend-detail-trends
tags: [react, react-router, hashrouter, echarts, react-query, vitest]

requires:
  - phase: 03-frontend-visualization
    plan: 02
    provides: "Static JSON contracts, React Query hooks, and derived data-center-cluster entity level"
  - phase: 03-frontend-visualization
    plan: 03
    provides: "Public latest/rankings/history/index-config/crossref JSON assets and bundle gate"
  - phase: 03-frontend-visualization
    plan: 04
    provides: "HUD shell, ranking rail, badges, and loading/error primitives"
  - phase: 03-frontend-visualization
    plan: 05
    provides: "MapLibre explorer, Zustand selection state, and derived cluster drilldown helpers"
provides:
  - "HashRouter route tree where root and /entity/:type/:id render the persistent map-first App shell"
  - "Routeable real entity detail rail with score, confidence, completeness, freshness, source coverage, risk modeling context, and factor breakdown"
  - "Derived data-center-cluster detail rendering from crossref-only modeled cluster proxies"
  - "Lazy ECharts trend chart chunk using core imports and dark HUD option builder"
affects: [03-frontend-visualization, FE-02, FE-04, FE-05, FE-06, FE-08]

tech-stack:
  added: []
  patterns:
    - "Use HashRouter for GitHub Pages-compatible shareable detail routes."
    - "Keep /entity/:type/:id routed through App so ComputeMap and RankingRail remain mounted."
    - "Resolve data-center-cluster details through crossref-derived cluster proxies only."
    - "Lazy-load detail and ECharts chart surfaces from route/selection boundaries."

key-files:
  created:
    - src/app/router.tsx
    - src/app/router.test.tsx
    - src/features/details/EntityDetailRoute.tsx
    - src/features/details/FactorBreakdown.tsx
    - src/features/details/entity-detail.test.tsx
    - src/features/trends/TrendChart.tsx
    - src/features/trends/trend-options.ts
    - src/features/trends/trend-options.test.ts
  modified:
    - src/app/App.tsx
    - src/main.tsx

key-decisions:
  - "Kept detail routes shell-first: HashRouter changes URL state while App continues to render ComputeMap and RankingRail."
  - "Rendered derived clusters from resolveClusterDetail and crossref metadata only, avoiding nonexistent cluster aggregate records and per-cluster files."
  - "Placed ECharts imports exclusively in the lazy TrendChart chunk to keep the initial entry bundle below the 300KB gzip gate."

patterns-established:
  - "Route params are validated against known entity levels plus data-center-cluster before selection/detail rendering."
  - "Factor rows iterate index-config factors so missing breakdowns show Factor unavailable without hiding the rest of the detail."
  - "Trend option construction is unit-tested separately from the lazy React/ECharts wrapper."

requirements-completed: [FE-02, FE-04, FE-05, FE-06, FE-08]

duration: 16 min
completed: 2026-05-07
---

# Phase 03 Plan 06: Detail Routes and Trend Charts Summary

**HashRouter detail routes with crossref-derived cluster proxy panels, source/factor/risk explanations, and lazy ECharts trend charts under the bundle gate**

## Performance

- **Duration:** 16 min
- **Started:** 2026-05-07T10:14:36Z
- **Completed:** 2026-05-07T10:30:11Z
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments

- Added `AppRouter` using `HashRouter`, with both `/` and `/entity/:type/:id` rendering the persistent `App` shell.
- Updated `App` and `main` so routeable entity details lazy-load inside the existing map-first shell without adding a second provider or unmounting `ComputeMap`/`RankingRail`.
- Implemented real entity detail panels showing score, trend-signal framing, confidence/completeness/freshness/risk badges, source identifiers, and factor raw/normalized/weight/contribution rows.
- Implemented derived `data-center-cluster` panels from `resolveClusterDetail`, including parent cloud region, provider, country, city, modeled proxy label, and required integrity copy.
- Added lazy ECharts trend chart rendering with core imports only, plus a tested dark HUD trend option builder and empty `No recent history` state.

## Task Commits

Each TDD task was committed atomically with RED and GREEN commits:

1. **Task 1 RED: Add HashRouter route tree tests** - `54073b0` (`test(03-06): add failing router tests`)
2. **Task 1 GREEN: Add HashRouter route tree with lazy detail boundary including cluster type** - `9e52531` (`feat(03-06): add HashRouter detail routes`)
3. **Task 2 RED: Add entity and cluster detail tests** - `c84027b` (`test(03-06): add failing entity detail tests`)
4. **Task 2 GREEN: Implement entity and cluster detail route with factor breakdown** - `73ce891` (`feat(03-06): implement entity detail rail`)
5. **Task 3 RED: Add trend option and ECharts import tests** - `74a63e7` (`test(03-06): add failing trend option tests`)
6. **Task 3 GREEN: Add lazy ECharts trend chart and bundle verification** - `3b1c44a` (`feat(03-06): add lazy trend chart`)

**Plan metadata:** committed after this summary is written.

## Files Created/Modified

- `src/app/router.tsx` - HashRouter route tree for root and shareable entity hash routes.
- `src/app/router.test.tsx` - Router tests for HashRouter, persistent shell mounting, cluster route acceptance, and no eager ECharts imports.
- `src/app/App.tsx` - Persistent shell now syncs valid route params to explorer state and lazy-loads the detail rail inside Suspense.
- `src/main.tsx` - Renders `AppRouter` inside the existing `Providers` boundary.
- `src/features/details/EntityDetailRoute.tsx` - Route param validation, real entity detail rendering, cluster proxy rendering, source coverage, risk copy, and lazy trend chart boundary.
- `src/features/details/FactorBreakdown.tsx` - Config-driven factor table with raw value, normalized score, weight, contribution, and missing-factor states.
- `src/features/details/entity-detail.test.tsx` - Component tests for detail fields, source identifiers, risk copy, missing factors, cluster proxy behavior, and cluster fetch avoidance.
- `src/features/trends/TrendChart.tsx` - Lazy ECharts core wrapper registering only line/grid/tooltip/canvas modules.
- `src/features/trends/trend-options.ts` - Dark HUD ECharts option builder with `No recent history` empty state.
- `src/features/trends/trend-options.test.ts` - Unit tests for axis/series mapping, empty state, HUD colors, and ECharts import discipline.

## Decisions Made

- Kept detail routes as shell state rather than separate pages so shareable URLs preserve the map-first exploration model.
- Used normal JSX text rendering for all static JSON-derived labels and detail copy; no raw HTML rendering was introduced.
- Treated per-cluster details as modeled proxies only, with no `latest.entities[cluster]` lookup and no `data/entities/data-center-cluster` fetch path.
- Left MapLibre as an existing initial visualization chunk while ensuring ECharts is isolated to the lazy `TrendChart` chunk.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Used Vitest targeted commands without unsupported `-x` flag**
- **Found during:** Tasks 1, 2, and 3 verification
- **Issue:** Prior phase evidence and installed Vitest 4.1.5 reject the plan's `-x` flag, which would block equivalent targeted verification.
- **Fix:** Ran equivalent targeted commands without `-x`: `npm test -- src/app/router.test.tsx`, `npm test -- src/features/details/entity-detail.test.tsx`, and `npm test -- src/features/trends/trend-options.test.ts`.
- **Files modified:** None
- **Verification:** All targeted suites passed.
- **Committed in:** N/A, command-only deviation

**2. [Rule 1 - Bug] Fixed Node path handling in router source assertions**
- **Found during:** Task 1 GREEN verification
- **Issue:** `readFileSync(new URL('./router.tsx', import.meta.url))` failed in the Vitest/jsdom transform with `The URL must be of scheme file`.
- **Fix:** Switched the router test source read to `join(process.cwd(), 'src/app/router.tsx')`.
- **Files modified:** `src/app/router.test.tsx`
- **Verification:** `npm test -- src/app/router.test.tsx` passed with 5 tests.
- **Committed in:** `9e52531`

**3. [Rule 1 - Bug] Adjusted duplicate text assertions for intentional repeated risk copy**
- **Found during:** Task 2 GREEN verification
- **Issue:** Detail UI intentionally rendered `Risk adjustment`/`Modeling assumption` in both badge and explanatory copy, causing singular Testing Library queries to fail.
- **Fix:** Updated tests to assert at least one matching element and kept both visible risk contexts.
- **Files modified:** `src/features/details/entity-detail.test.tsx`
- **Verification:** `npm test -- src/features/details/entity-detail.test.tsx` passed with 8 tests.
- **Committed in:** `73ce891`

**4. [Rule 1 - Bug] Cleaned generated pipeline outputs after plan-level verification**
- **Found during:** Plan-level verification cleanup
- **Issue:** `npm run pipeline` refreshed tracked aggregate JSON and generated additional public per-entity files outside the strict 03-06 implementation scope.
- **Fix:** Restored tracked aggregate JSON and removed generated untracked pipeline outputs while preserving tracked entity fixture files.
- **Files modified:** None committed
- **Verification:** `git status --short` returned only pre-existing untracked `.omc/` before summary creation.
- **Committed in:** N/A, cleanup only

---

**Total deviations:** 4 auto-fixed (1 blocking command compatibility, 3 bugs/cleanup issues)
**Impact on plan:** All fixes were required to verify scoped behavior and maintain the strict implementation-file boundary. No extra implementation files were introduced.

## Issues Encountered

- `npm run pipeline` took several minutes and appeared hung while the AWS scraper was running, but the background command ultimately completed successfully with `Records: 7106, Written: 81, Skipped: 0`.
- The production build still emits Vite's large-chunk warning for lazy `TrendChart` and MapLibre chunks, but `npm run bundle:check` passed because the initial entry bundle is 94,776 bytes gzip, well under the 300KB gate.
- `.omc/` existed as an untracked orchestration directory and was left unmodified/uncommitted.

## Verification

- `npm test -- src/app/router.test.tsx` - passed (5 tests)
- `npm test -- src/features/details/entity-detail.test.tsx` - passed (8 tests)
- `npm test -- src/features/trends/trend-options.test.ts` - passed (4 tests)
- `npm run build` - passed; entry bundle `dist/assets/index-CzP45fqL.js` built at 302.31 kB raw / 95.84 kB gzip, with `TrendChart` split into a lazy chunk
- `npm run bundle:check` - passed; measured initial entry chunk at 94,776 bytes gzip
- `npm test` - passed; 20 files and 117 tests
- `npm run pipeline` - passed; records 7106, written 81, skipped 0

## Acceptance Criteria Results

Task 1:
- `grep -v '^#' src/app/router.tsx | grep -c 'HashRouter'` - `3` (pass)
- `grep -v '^#' src/app/router.tsx | grep -c 'BrowserRouter'` - `0` (pass)
- `grep -v '^#' src/app/router.tsx | grep -c '/entity/:type/:id'` - `1` (pass)
- `grep -v '^#' src/app/App.tsx | grep -c 'data-center-cluster'` - `1` (pass)
- `grep -v '^#' src/app/App.tsx | grep -c 'Loading detail'` - `1` (pass)
- `grep -v '^#' src/main.tsx | grep -c 'AppRouter'` - `2` (pass)
- `grep -v '^#' src/main.tsx | grep -c '<App />'` - `0` (pass)
- `grep -v '^#' src/features/details/EntityDetailRoute.tsx | grep -c 'export default'` - `1` (pass)
- `grep -v '^#' src/app/App.tsx | grep -c 'ComputeMap'` - `2` (pass)
- `grep -v '^#' src/app/App.tsx | grep -c 'RankingRail'` - `2` (pass)
- `grep -v '^#' src/app/router.tsx | grep -ci 'echarts\|echarts-for-react'` - `0` (pass)

Task 2:
- `grep -v '^#' src/features/details/FactorBreakdown.tsx | grep -c 'Raw value'` - `1` (pass)
- `grep -v '^#' src/features/details/FactorBreakdown.tsx | grep -c 'Normalized score'` - `1` (pass)
- `grep -v '^#' src/features/details/EntityDetailRoute.tsx | grep -c 'Return to map'` - `1` (pass)
- `grep -v '^#' src/features/details/EntityDetailRoute.tsx src/data/queries.ts | grep -c 'data/entities'` - `1` (pass)
- `grep -v '^#' src/features/details/EntityDetailRoute.tsx | grep -c 'data-center-cluster'` - `3` (pass)
- `grep -v '^#' src/features/details/EntityDetailRoute.tsx | grep -c 'modeled cluster proxy'` - `1` (pass)
- `grep -v '^#' src/features/details/EntityDetailRoute.tsx | grep -c 'not a verified facility'` - `1` (pass)
- `grep -v '^#' src/features/details/EntityDetailRoute.tsx | grep -c 'latest.entities\[.*cluster'` - `0` (pass)
- `grep -v '^#' src/features/details/EntityDetailRoute.tsx src/data/queries.ts | grep -c 'data/entities/data-center-cluster'` - `0` (pass)
- `grep -v '^#' src/features/details/EntityDetailRoute.tsx | grep -ci 'legal risk\|compliance verdict\|sanctioned'` - `0` (pass)

Task 3:
- `grep -v '^#' src/features/trends/TrendChart.tsx | grep -c 'echarts-for-react/lib/core'` - `1` (pass)
- `grep -v '^#' src/features/trends/TrendChart.tsx | grep -c 'LineChart'` - `2` (pass)
- `grep -v '^#' src/features/trends/trend-options.ts | grep -c '#22D3EE'` - `2` (pass)
- `grep -v '^#' src/features/trends/trend-options.ts | grep -c 'No recent history'` - `2` (pass)
- `grep -v '^#' src/features/details/EntityDetailRoute.tsx | grep -c 'Loading trend chart'` - `1` (pass)
- `grep -v '^#' src/app/router.tsx src/app/App.tsx src/main.tsx | grep -ci 'echarts\|echarts-for-react'` - `0` (pass)

## Known Stubs

None. Stub-pattern scan found no TODO/FIXME/placeholder/coming-soon/not-available patterns in scoped files. `No recent history`, `Factor unavailable`, and `Source file unavailable` are intentional UI empty/unavailable states required by the plan and UI copy contract, not incomplete stubs.

## Threat Flags

None. The plan implemented the listed route-param, static JSON, derived cluster, lazy chart, and bundle mitigations. It added no backend endpoints, auth paths, secrets, databases, or unmodeled trust boundaries.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Phase 03 frontend visualization is ready for orchestrator merge and phase-level verification. The app now has the map-first explorer, rankings, shareable HashRouter details, factor/source/risk explanations, modeled cluster proxy detail support, and lazy trend charts with the initial bundle gate passing.

## Self-Check: PASSED

- Found all scoped implementation files: `src/app/router.tsx`, `src/app/router.test.tsx`, `src/app/App.tsx`, `src/main.tsx`, `src/features/details/EntityDetailRoute.tsx`, `src/features/details/FactorBreakdown.tsx`, `src/features/details/entity-detail.test.tsx`, `src/features/trends/TrendChart.tsx`, `src/features/trends/trend-options.ts`, and `src/features/trends/trend-options.test.ts`.
- Found task commits `54073b0`, `9e52531`, `c84027b`, `73ce891`, `74a63e7`, and `3b1c44a` in git history.
- Stub scan found no incomplete placeholder/TODO/FIXME patterns in scoped files.
- No shared orchestrator artifacts (`STATE.md`, `ROADMAP.md`) were modified.
- Working tree before summary creation contained only the pre-existing untracked `.omc/` orchestration directory.

---
*Phase: 03-frontend-visualization*
*Completed: 2026-05-07*
