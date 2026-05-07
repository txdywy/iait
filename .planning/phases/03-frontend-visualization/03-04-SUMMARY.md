---
phase: 03-frontend-visualization
plan: 04
subsystem: frontend-hud-shell
tags: [react, tailwindcss, vitest, react-query, rankings, accessibility]

requires:
  - phase: 03-frontend-visualization
    plan: 01
    provides: "React/Vite/Tailwind frontend scaffold and initial shell"
  - phase: 03-frontend-visualization
    plan: 02
    provides: "Static JSON contracts and React Query hooks for latest index and rankings"
  - phase: 03-frontend-visualization
    plan: 03
    provides: "Public latest/rankings aggregate JSON snapshots and bundle gate"
provides:
  - "Dark full-viewport ComputeAtlas HUD shell with exact Phase 03 color tokens and focus treatment"
  - "Reusable HUD panel, status badge, loading, error, and empty state primitives"
  - "Tested country, city, and cloud-region ranking rail wired into the initial app shell"
affects: [03-frontend-visualization, FE-03, FE-07, FE-09]

tech-stack:
  added: []
  patterns:
    - "Use CSS variables in src/styles/index.css for HUD color, surface, border, focus, and numeric tokens"
    - "Render confidence, completeness, freshness, and risk context as text-labeled badges rather than color-only states"
    - "Ranking rail consumes useRankings and useLatestIndex without recomputing source scores"

key-files:
  created:
    - src/components/HudPanel.tsx
    - src/components/StatusBadges.tsx
    - src/components/LoadingState.tsx
    - src/components/hud-panel.test.tsx
    - src/features/rankings/RankingRail.tsx
    - src/features/rankings/rankings.test.tsx
  modified:
    - src/app/App.tsx
    - src/styles/index.css

key-decisions:
  - "Kept the initial shell map-first and deferred real map rendering to later scoped plans while wiring the ranking rail into the side slot."
  - "Sorted ranking rows defensively at render time but preserved pipeline-provided scores and low-confidence entries when scores are usable."
  - "Labeled risk copy as a modeling assumption and avoided legal/compliance verdict language."

patterns-established:
  - "TDD UI behavior tests live beside scoped components under src/components and src/features."
  - "Static JSON-derived strings render through normal JSX text nodes only; no raw HTML injection props were introduced."
  - "Low-confidence ranking rows are de-emphasized with muted/amber styling but not hidden unless score is zero or non-finite."

requirements-completed: [FE-03, FE-07, FE-09]

duration: 5 min
completed: 2026-05-07
---

# Phase 03 Plan 04: HUD Shell and Ranking Rail Summary

**Dark ComputeAtlas HUD shell with accessible status primitives and a tested static-JSON ranking rail for country, city, and cloud-region comparison**

## Performance

- **Duration:** 5 min
- **Started:** 2026-05-07T09:56:34Z
- **Completed:** 2026-05-07T10:01:44Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments

- Updated the app shell and global CSS to use the exact Phase 03 HUD colors, glass panel tokens, IBM Plex Mono fallback stack, tabular numeric utility, and cyan focus outline.
- Added reusable `HudPanel`, confidence/completeness/freshness/risk badges, and loading/error/empty state primitives with UI-SPEC copy and text labels.
- Added a tested `RankingRail` consuming `useRankings()` and `useLatestIndex()` for Countries, Cities, and Cloud Regions, sorted by score descending and mounted in `App`.
- Preserved the strict phase boundary: no MapLibre map components, drilldown helpers, routes, detail panels, or ECharts charts were implemented.

## Task Commits

Each task was committed atomically, with TDD RED/GREEN commits for Tasks 2 and 3:

1. **Task 1: Extend HUD CSS tokens and shell layout** - `e989235` (`feat(03-04): extend HUD shell tokens`)
2. **Task 2 RED: Reusable HUD panels, status badges, and loading/error states** - `91dc7db` (`test(03-04): add failing HUD primitive tests`)
3. **Task 2 GREEN: Reusable HUD panels, status badges, and loading/error states** - `ce676a6` (`feat(03-04): implement HUD primitives`)
4. **Task 3 RED: Ranking rail for countries, cities, and cloud regions** - `4bf52a9` (`test(03-04): add failing ranking rail tests`)
5. **Task 3 GREEN: Ranking rail for countries, cities, and cloud regions** - `334ec7e` (`feat(03-04): implement ranking rail`)

**Plan metadata:** committed after this summary is written.

## Files Created/Modified

- `src/app/App.tsx` - Full-viewport dark map-first shell with `ComputeAtlas`, `Explore Index`, `Predictive compute trend signal`, loading map placeholder, and mounted `RankingRail` side slot.
- `src/styles/index.css` - Tailwind CSS 4 entry, exact HUD token colors, mono stack, panel/focus utilities, and tabular numeric class.
- `src/components/HudPanel.tsx` - Reusable glass HUD panel primitive with optional eyebrow and selected border treatment.
- `src/components/StatusBadges.tsx` - Text-labeled confidence, completeness, freshness, and risk badges with safe modeling-assumption risk copy.
- `src/components/LoadingState.tsx` - Loading, error, and empty primitives with UI-SPEC copy.
- `src/components/hud-panel.test.tsx` - React Testing Library coverage for HUD panel and status badge behavior.
- `src/features/rankings/RankingRail.tsx` - Country/city/cloud-region ranking rail consuming static JSON query hooks and rendering badge metadata.
- `src/features/rankings/rankings.test.tsx` - React Query-backed tests for scope controls, score sorting, low-confidence visibility, row metadata, and selection callbacks.

## Decisions Made

- Kept the map canvas as a labeled dark placeholder because this plan explicitly forbids implementing MapLibre map components.
- Mounted rankings in the shell only after `RankingRail` existed, matching the task sequencing requirement.
- Used render-time defensive sorting and score filtering for usability while preserving pipeline score authority.
- Treated TDD test cleanup as part of Task 3 GREEN after discovering Testing Library DOM accumulation across tests.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Used Vitest's supported targeted command without the unsupported `-x` flag**
- **Found during:** Task 2 and Task 3 verification
- **Issue:** Prior phase evidence showed the installed Vitest 4.1.5 rejects `-x`; using the literal plan command would block verification without changing test coverage.
- **Fix:** Ran equivalent targeted commands without `-x`: `npm test -- src/components/hud-panel.test.tsx` and `npm test -- src/features/rankings/rankings.test.tsx`.
- **Files modified:** None
- **Verification:** Both targeted suites passed.
- **Committed in:** N/A, command-only deviation

**2. [Rule 1 - Bug] Added explicit Testing Library cleanup for ranking tests**
- **Found during:** Task 3 GREEN verification
- **Issue:** Multiple renders accumulated DOM nodes across tests, producing duplicate accessible buttons and duplicate badge text queries.
- **Fix:** Added `afterEach(cleanup)` to the ranking rail test file.
- **Files modified:** `src/features/rankings/rankings.test.tsx`
- **Verification:** `npm test -- src/features/rankings/rankings.test.tsx` passed with 4 tests.
- **Committed in:** `334ec7e`

---

**Total deviations:** 2 auto-fixed (1 blocking command compatibility, 1 test isolation bug)
**Impact on plan:** Both fixes were necessary to verify scoped behavior. No additional implementation files outside the allowed scope were edited.

## Issues Encountered

- Task 2 and Task 3 RED phases failed for missing component imports as expected before implementation.
- Task 3 acceptance grep required the literal `score <= 0`; the implementation was adjusted to preserve the literal guard while still filtering unusable zero/non-finite scores.
- `.omc/` existed as an untracked orchestration directory before and after execution; it was not modified or committed as part of this scoped plan.

## Verification

- `npm test -- src/components/hud-panel.test.tsx` - passed (5 tests)
- `npm test -- src/features/rankings/rankings.test.tsx` - passed (4 tests)
- `npm run build` - passed; Vite entry JavaScript built at 232.87 kB raw / 72.73 kB gzip
- `npm run bundle:check` - passed; measured `dist/assets/index-DssJNI10.js` at 71908 bytes gzip
- `npm test` - passed; 15 files and 86 tests

## Acceptance Criteria Results

Task 1:
- `grep -v '^#' src/app/App.tsx | grep -c 'RankingRail'` before Task 3 - `0` (pass)
- `grep -v '^#' src/app/App.tsx | grep -c 'Predictive compute trend signal'` - `1` (pass)
- `grep -v '^#' src/app/App.tsx | grep -c 'Explore Index'` - `2` (pass; expected at least one visible shell/rail label)
- `grep -v '^#' src/styles/index.css | grep -c '@import "tailwindcss"'` - `1` (pass)
- `grep -v '^#' src/styles/index.css | grep -c '#22D3EE'` - `2` (pass)

Task 2:
- `grep -v '^#' src/components/HudPanel.tsx | grep -c 'backdrop-blur'` - `1` (pass)
- `grep -v '^#' src/components/StatusBadges.tsx | grep -c 'Confidence'` - `5` (pass)
- `grep -v '^#' src/components/StatusBadges.tsx | grep -c 'Partial factors'` - `1` (pass)
- `grep -v '^#' src/components/StatusBadges.tsx | grep -c 'Modeling assumption'` - `1` (pass)
- `grep -v '^#' src/components/StatusBadges.tsx | grep -ci 'legal risk\|compliance verdict\|sanctioned'` - `0` (pass)
- `grep -v '^#' src/components/LoadingState.tsx | grep -c 'Compute data could not load'` - `1` (pass)

Task 3:
- `grep -v '^#' src/features/rankings/RankingRail.tsx | grep -c 'Countries'` - `1` (pass)
- `grep -v '^#' src/features/rankings/RankingRail.tsx | grep -c 'Cloud Regions'` - `1` (pass)
- `grep -v '^#' src/features/rankings/RankingRail.tsx | grep -c 'ConfidenceBadge'` - `2` (pass)
- `grep -v '^#' src/features/rankings/RankingRail.tsx | grep -c 'FreshnessBadge'` - `2` (pass)
- `grep -v '^#' src/features/rankings/RankingRail.tsx | grep -c 'score <= 0'` - `1` (pass)
- `grep -v '^#' src/app/App.tsx | grep -c 'RankingRail'` - `2` (pass)

## Known Stubs

None. The map region remains an intentional loading placeholder for this plan because MapLibre map components are explicitly out of scope and assigned to later plans. The ranking rail is wired to real React Query static JSON hooks and does not use mock or hardcoded empty UI data.

## Threat Flags

None. This plan introduced no backend endpoints, auth paths, secrets, schema changes, or new file access patterns. Static JSON-derived values are rendered through JSX text nodes only, and the public static JSON trust boundary was already covered by the plan threat model.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

The frontend now has a scoped HUD component system and a live ranking rail consuming Phase 3 static data hooks. Later plans can add MapLibre maps, drilldown/detail routes, and ECharts panels without reworking the shell tokens or badge semantics.

## Self-Check: PASSED

- Found `src/app/App.tsx`, `src/styles/index.css`, `src/components/HudPanel.tsx`, `src/components/StatusBadges.tsx`, `src/components/LoadingState.tsx`, `src/components/hud-panel.test.tsx`, `src/features/rankings/RankingRail.tsx`, and `src/features/rankings/rankings.test.tsx`.
- Found task commits `e989235`, `91dc7db`, `ce676a6`, `4bf52a9`, and `334ec7e` in git history.
- Stub scan found no TODO/FIXME/coming-soon/placeholder/not-available patterns or hardcoded empty UI data in scoped source files.
- No shared orchestrator artifacts (`STATE.md`, `ROADMAP.md`) were modified.

---
*Phase: 03-frontend-visualization*
*Completed: 2026-05-07*
