---
phase: 04-automation-deployment
plan: 03
subsystem: infra
tags: [github-actions, github-pages, vite, deployment, vitest]

requires:
  - phase: 04-automation-deployment
    provides: Pipeline validation primitives for deploy workflow preflight checks
provides:
  - GitHub Pages deployment workflow for the static Vite app
  - Contract tests covering Pages triggers, permissions, validation, artifact upload, and immutable action pinning
affects: [automation-deployment, github-pages, static-site-deploy]

tech-stack:
  added: []
  patterns:
    - Least-privilege GitHub Pages workflow with contents read, pages write, and id-token write only
    - Privileged workflow action references pinned to full 40-character commit SHAs
    - Deployment contract tests inspect workflow YAML as text

key-files:
  created:
    - .github/workflows/deploy.yml
    - scripts/__tests__/workflow-deploy.test.ts
  modified: []

key-decisions:
  - "Deploy workflow intentionally has no push path filters so generated public/data commits on main trigger publication."
  - "All privileged Pages/OIDC workflow actions are pinned to immutable commit SHAs instead of mutable tags."
  - "Deployment validates committed public/data before Vite build so a bad data commit blocks the next deploy while the previous Pages deployment remains served."

patterns-established:
  - "GitHub Pages deploys from dist after data validation, tests, typecheck, geo preparation, build, and bundle budget check."
  - "Workflow contract tests enforce least-privilege permissions, no secrets, HashRouter compatibility, Vite base /iait/, and action SHA pinning."

requirements-completed: [INF-02, INF-05]

duration: 2 min
completed: 2026-05-07
---

# Phase 04 Plan 03: Deployment Workflow Summary

**Least-privilege GitHub Pages deployment with validated static data, Vite `/iait/` output, HashRouter compatibility, and SHA-pinned privileged actions.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-05-07T14:18:16Z
- **Completed:** 2026-05-07T14:21:12Z
- **Tasks:** 2 completed
- **Files modified:** 2

## Accomplishments

- Added deploy workflow contract tests that fail before `.github/workflows/deploy.yml` exists and then enforce deployment invariants.
- Created a GitHub Pages workflow that triggers on push to `main` and manual dispatch without path filters, allowing generated `public/data/**` commits to publish.
- Added least-privilege Pages/OIDC permissions, no secret references, data validation before build, and immutable SHA-pinned GitHub Actions dependencies.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add deployment workflow contract tests** - `59e022b` (test)
2. **Task 2: Create least-privilege GitHub Pages deploy workflow** - `a5e44fe` (feat)

**Plan metadata:** pending final docs commit

_Note: Task 1 followed TDD RED discipline: `npm test -- scripts/__tests__/workflow-deploy.test.ts` failed before the workflow existed with ENOENT for `.github/workflows/deploy.yml`._

## Files Created/Modified

- `.github/workflows/deploy.yml` - GitHub Pages deploy workflow that validates data, tests, typechecks, prepares geo assets, builds Vite output, checks bundle size, uploads `dist`, and deploys through Pages.
- `scripts/__tests__/workflow-deploy.test.ts` - Vitest contract tests for deploy triggers, no path filters, least-privilege permissions, no secrets, required build steps, Pages artifact/deploy actions, SHA-pinned action references, Vite base path, and HashRouter routing.

## Decisions Made

- Deploy push trigger has no `paths` or `paths-ignore` filter so data-pipeline generated `public/data/**` commits to `main` trigger deployment.
- The workflow uses only `contents: read`, `pages: write`, and `id-token: write`; it does not need `contents: write` or any secrets for static Vite deployment.
- Action dependencies in the privileged Pages/OIDC workflow are pinned to full 40-character commit SHAs resolved from upstream action tags.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created missing workflow directory**
- **Found during:** Task 2 (Create least-privilege GitHub Pages deploy workflow)
- **Issue:** `.github/` did not exist in the worktree, so the planned workflow path could not be written directly.
- **Fix:** Created `.github/workflows/` before writing `.github/workflows/deploy.yml`.
- **Files modified:** `.github/workflows/deploy.yml`
- **Verification:** `npm test -- scripts/__tests__/workflow-deploy.test.ts` passed after the workflow was created.
- **Committed in:** `a5e44fe`

---

**Total deviations:** 1 auto-fixed (Rule 3 blocking)
**Impact on plan:** Directory creation was required to place the planned workflow artifact. No scope creep.

## Issues Encountered

- Context7 CLI documentation lookup for GitHub Actions failed with `fetch failed`; action SHAs were verified directly with `git ls-remote` for the upstream action repositories.
- GitHub Actions workflow write triggered a security reminder about workflow injection risks; the workflow uses static commands only and does not interpolate untrusted event fields in `run:` commands.

## Verification

- `npm test -- scripts/__tests__/workflow-deploy.test.ts` — passed (7 tests)
- `npm run data:validate` — passed (`[data:validate] OK: public/data`)
- `npm run typecheck` — passed
- `npm run build` — passed
- `npm run bundle:check` — passed (`dist/assets/index-AtaKx6Ux.js: 95425 bytes gzip`)
- Static source audit passed:
  - No deploy `paths` or `paths-ignore` filters: `0`
  - No `contents: write`: `0`
  - No `secrets.` references: `0`
  - No mutable `actions/*@vN`, `@main`, or `@master` refs: `0`
  - SHA-pinned action refs: `4`
  - Vite base `/iait/`: `1`
  - HashRouter references: `3`

## Known Stubs

None.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: privileged-workflow | `.github/workflows/deploy.yml` | Adds a Pages/OIDC workflow at a trust boundary; mitigated by least-privilege permissions, no secrets, validation before build, and immutable SHA-pinned actions as specified in the plan threat model. |

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Phase 04 has a tested deployment workflow ready for orchestrator merge. The orchestrator should update shared state, roadmap, and requirements after all parallel worktree agents complete.

## Self-Check: PASSED

- Found `.github/workflows/deploy.yml`
- Found `scripts/__tests__/workflow-deploy.test.ts`
- Found task commit `59e022b`
- Found task commit `a5e44fe`

---
*Phase: 04-automation-deployment*
*Completed: 2026-05-07*
