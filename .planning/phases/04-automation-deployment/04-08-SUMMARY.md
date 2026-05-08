---
phase: 04-automation-deployment
plan: 08
subsystem: infra
tags: [github-actions, github-pages, deploy, source-sha, workflow-dispatch, security]

requires:
  - phase: 04-automation-deployment
    provides: Deploy Pages workflow with source_sha checkout and HEAD equality verification from earlier Phase 04 plans
provides:
  - Deploy Pages ancestry guard requiring workflow_dispatch source_sha to be reachable from origin/main
  - Workflow contract coverage proving non-main source_sha is rejected before build, artifact upload, or Pages deploy
affects: [automation-deployment, github-pages, data-pipeline-handoff, INF-02]

tech-stack:
  added: []
  patterns:
    - GitHub Actions workflow inputs are passed into shell through env indirection
    - Text-contract workflow tests enforce security-critical step ordering without a YAML parser

key-files:
  created:
    - .planning/phases/04-automation-deployment/04-08-SUMMARY.md
  modified:
    - .github/workflows/deploy.yml
    - scripts/__tests__/workflow-deploy.test.ts

key-decisions:
  - "Hardened deploy.yml rather than data-pipeline.yml so direct workflow_dispatch and Data Pipeline handoff use the same source_sha ancestry gate."
  - "Kept source_sha shell handling env-indirected to avoid GitHub Actions workflow command injection from dispatch inputs."

patterns-established:
  - "Deploy Pages validates requested source_sha equality and origin/main ancestry before dependency install, validation, build, artifact upload, or deploy."
  - "Workflow contract tests compare step ordering for production deployment safety invariants."

requirements-completed: [INF-02]

duration: 2min
completed: 2026-05-08
---

# Phase 04 Plan 08: Deploy Source SHA Main-Ancestry Guard Summary

**GitHub Pages deployment now rejects workflow_dispatch source_sha values unless they are reachable from origin/main before any production build or Pages publication can occur.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-05-08T06:40:25Z
- **Completed:** 2026-05-08T06:42:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Added RED contract coverage proving Deploy Pages requires full checkout history, an origin/main ancestry guard, and guard-before-build ordering for dispatch source_sha inputs.
- Added `fetch-depth: 0` and a guarded `Verify requested source SHA is on main` step that fetches `origin/main` and rejects non-main-reachable SHAs with a clear failure message.
- Preserved push-to-main behavior and existing source_sha HEAD equality verification while adding defense-in-depth for Data Pipeline handoff and direct manual dispatch.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add RED contract coverage for main ancestry enforcement** - `dc32be6` (test)
2. **Task 2: Enforce origin/main ancestry before Pages build and publish** - `2d44d97` (feat)

**Plan metadata:** committed separately after this summary.

_Note: TDD tasks used RED then GREEN commits._

## Files Created/Modified

- `.github/workflows/deploy.yml` - Adds full-history checkout and source_sha origin/main ancestry verification before build/publish steps.
- `scripts/__tests__/workflow-deploy.test.ts` - Adds workflow contract test for ancestry guard contents and ordering before deployable artifacts.
- `.planning/phases/04-automation-deployment/04-08-SUMMARY.md` - Records execution results, verification, and commits.

## Decisions Made

- Hardened `deploy.yml` instead of changing `data-pipeline.yml` so both Data Pipeline handoff and direct `workflow_dispatch` are protected by the same production publication gate.
- Used `REQUESTED_SOURCE_SHA` env indirection in the new shell step, matching the existing injection-safe workflow input pattern.
- Kept workflow contract tests dependency-free and text-based, consistent with the existing test suite.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- The RED test failed as expected before workflow implementation because `fetch-depth: 0` and the ancestry guard were absent.
- The GitHub Actions workflow edit triggered a security reminder; the implementation followed the safe env-indirection pattern required by the plan.

## Verification

- `npm test -- scripts/__tests__/workflow-deploy.test.ts` failed in RED before implementation with 1 expected failing test.
- `npm test -- scripts/__tests__/workflow-deploy.test.ts` passed after implementation: 9 tests passed.
- `npm run typecheck` passed.
- `npm test -- scripts/__tests__/workflow-data-pipeline.test.ts scripts/__tests__/workflow-deploy.test.ts` passed: 17 tests passed.

## Known Stubs

None found in modified plan files.

## Threat Flags

None beyond the plan threat model. The new security-relevant surface is the planned Deploy Pages source_sha ancestry guard for workflow_dispatch and Data Pipeline handoff.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- INF-02 deployment integrity blocker should be ready for phase re-verification: non-main dispatch source_sha values cannot reach build, artifact upload, or Pages deploy.
- Deferred non-blocking review warnings WR-01 and WR-02 remain intentionally outside this focused plan.

## Self-Check: PASSED

- Created summary file: `.planning/phases/04-automation-deployment/04-08-SUMMARY.md`
- Verified task commits exist: `dc32be6`, `2d44d97`
- Verified modified files exist: `.github/workflows/deploy.yml`, `scripts/__tests__/workflow-deploy.test.ts`

---
*Phase: 04-automation-deployment*
*Completed: 2026-05-08*
