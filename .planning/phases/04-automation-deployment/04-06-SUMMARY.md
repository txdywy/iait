---
phase: 04-automation-deployment
plan: 06
subsystem: automation-deployment
tags: [github-actions, data-validation, snapshots, static-data, gap-closure]
dependency_graph:
  requires: [04-05]
  provides: [complete static-data rollback snapshots, latest-to-detail validation, source_sha-bound Pages deploy]
  affects: [public/data, GitHub Pages deployment, Phase 04 verification]
tech-stack:
  added: []
  patterns: [fail-closed static data validation, recursive entity detail snapshotting, workflow_dispatch SHA verification]
key_files:
  created:
    - public/data/entities/city/amsterdam.json
    - public/data/entities/city/ashburn.json
    - public/data/entities/city/changhua.json
    - public/data/entities/city/council-bluffs.json
    - public/data/entities/city/dallas.json
    - public/data/entities/city/dublin.json
    - public/data/entities/city/frankfurt.json
    - public/data/entities/city/london.json
    - public/data/entities/city/portland.json
    - public/data/entities/city/pune.json
    - public/data/entities/city/sao-paulo.json
    - public/data/entities/city/singapore.json
    - public/data/entities/city/st-ghislain.json
    - public/data/entities/city/tokyo.json
    - public/data/entities/city/toronto.json
    - public/data/entities/country/be.json
    - public/data/entities/country/br.json
    - public/data/entities/country/tw.json
  modified:
    - scripts/snapshot-data.ts
    - scripts/__tests__/snapshot-data.test.ts
    - scripts/validate-data.ts
    - scripts/__tests__/validate-data.test.ts
    - .github/workflows/deploy.yml
    - scripts/__tests__/workflow-deploy.test.ts
key_decisions:
  - Use `entities/` as the snapshot manifest marker when recursive entity detail data is copied.
  - Bind Deploy Pages workflow_dispatch runs to `source_sha` and verify HEAD before validation/build/publish.
  - Backfill missing committed city/country detail JSON from latest aggregate entities so stricter validation can pass for the current static dataset.
metrics:
  duration: ~4 minutes
  completed: 2026-05-08T05:36:00Z
  tasks_completed: 3
  files_modified: 24
requirements_completed: [INF-01, INF-02, INF-04, INF-05, INF-06]
---

# Phase 04 Plan 06: Automation Deployment Gap Closure Summary

## One-liner

Complete static-data rollback snapshots and fail-closed deployment validation with source_sha-bound GitHub Pages handoff.

## Performance

- **Duration:** ~4 minutes
- **Started:** 2026-05-08T05:32:01Z
- **Completed:** 2026-05-08T05:36:00Z
- **Tasks:** 3
- **Files modified:** 24

## Completed Tasks

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 | Add entity-detail regression tests for complete snapshots and validation | 5c5b2e6 | scripts/__tests__/snapshot-data.test.ts, scripts/__tests__/validate-data.test.ts |
| 2 | Implement complete snapshot copying and latest-to-detail validation | d51cd1f | scripts/snapshot-data.ts, scripts/__tests__/snapshot-data.test.ts, scripts/validate-data.ts, scripts/__tests__/validate-data.test.ts, public/data/entities/**/*.json |
| 3 | Pin Deploy Pages checkout to source_sha and verify checked-out HEAD | 88d129b, 379a74f | .github/workflows/deploy.yml, scripts/__tests__/workflow-deploy.test.ts |

## What Changed

- Added RED regression tests proving snapshots must copy `entities/cloud-region/root-safe.json`, record `entities/` in manifests, and reject missing entity detail data during validation.
- Updated snapshot creation to recursively copy `public/data/entities` into each dated snapshot inside the existing cleanup-protected copy block.
- Updated validation to require `entities/` whenever `latest.json.entities` is non-empty and to fail for missing `entities/{type}/{id}.json` detail files.
- Backfilled 18 missing committed city/country entity detail files derived from aggregate `latest.json` so the current static dataset satisfies the stricter validation contract.
- Updated Deploy Pages to check out `${{ inputs.source_sha || github.sha }}` and fail closed if `git rev-parse HEAD` differs from the requested dispatch SHA.
- Preserved deploy push/manual behavior, no path filters, no secrets, immutable action pins, and least-privilege Pages permissions.

## Verification

| Command | Result |
| ------- | ------ |
| `npm test -- scripts/__tests__/snapshot-data.test.ts scripts/__tests__/validate-data.test.ts` before Task 2 implementation | Failed as expected with missing snapshot entity copy and latest-to-detail validation errors |
| `npm test -- scripts/__tests__/workflow-deploy.test.ts` before workflow implementation | Failed as expected until source_sha checkout and verification were added |
| `npm test -- scripts/__tests__/snapshot-data.test.ts scripts/__tests__/validate-data.test.ts scripts/__tests__/workflow-deploy.test.ts` | Passed: 3 files, 57 tests |
| `npm run data:validate` | Passed: `[data:validate] OK: public/data` |
| `npm run typecheck` | Passed |

## Acceptance Criteria Evidence

- `scripts/snapshot-data.ts` contains `fs.cp`, `ENTITY_DETAILS_MANIFEST_ENTRY`, and `entities/` manifest coverage.
- `scripts/validate-data.ts` contains exactly one `entities directory is required when latest.json contains entities` error and one `Missing referenced entity detail file` error path.
- `scripts/__tests__/workflow-deploy.test.ts` asserts the literal `inputs.source_sha || github.sha` checkout fallback and `git rev-parse HEAD` verification.
- `.github/workflows/deploy.yml` contains exactly one `ref: ${{ inputs.source_sha || github.sha }}`, one `Verify requested source SHA` step, and one `git rev-parse HEAD` guard.
- `.github/workflows/deploy.yml` contains zero `contents: write`, zero `secrets.`, zero `paths:`, and zero `paths-ignore:` non-comment entries.

## Decisions Made

- Use a directory-level `entities/` manifest entry rather than enumerating every copied detail file, matching the plan and keeping manifests compact.
- Use an environment variable for `inputs.source_sha` in the verification shell step to avoid GitHub Actions command-injection anti-patterns while preserving source SHA binding.
- Treat missing current public data detail files as blocking under the new validator and backfill them in the same task commit so deployment remains fail-closed and green.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Backfilled missing current static entity detail files**
- **Found during:** Task 2 (Implement complete snapshot copying and latest-to-detail validation)
- **Issue:** After latest-to-detail validation was added, `npm run data:validate` correctly failed because committed `latest.json` referenced 18 city/country entities without corresponding detail files.
- **Fix:** Added detail JSON files for the missing city and country entities under `public/data/entities/**`, derived from aggregate latest entity data.
- **Files modified:** `public/data/entities/city/*.json`, `public/data/entities/country/*.json`
- **Verification:** `npm run data:validate` passed with `[data:validate] OK: public/data`.
- **Commit:** d51cd1f

**2. [Rule 2 - Security] Used env indirection for workflow_dispatch input in shell verification**
- **Found during:** Task 3 (Pin Deploy Pages checkout to source_sha and verify checked-out HEAD)
- **Issue:** Directly interpolating `${{ inputs.source_sha }}` inside `run:` would violate GitHub Actions command-injection guidance for untrusted workflow inputs.
- **Fix:** Passed `inputs.source_sha` via `env: EXPECTED_SOURCE_SHA` and compared `EXPECTED_SHA="$EXPECTED_SOURCE_SHA"` to `git rev-parse HEAD`.
- **Files modified:** `.github/workflows/deploy.yml`, `scripts/__tests__/workflow-deploy.test.ts`
- **Verification:** `npm test -- scripts/__tests__/workflow-deploy.test.ts` passed.
- **Commit:** 88d129b

**Total deviations:** 2 auto-fixed (2 missing/security-critical)
**Impact on plan:** Both fixes are required for safe static publication and workflow input handling; no architectural changes or new dependencies were introduced.

## Auth Gates

None.

## Known Stubs

None found in created or modified files.

## Threat Flags

No new security-relevant surfaces beyond the plan threat model. Snapshot completeness, latest-to-detail validation, and Deploy Pages source SHA verification were all explicitly covered by the plan threat register.

## Deferred Issues

None.

## TDD Gate Compliance

- RED commit: 5c5b2e6 `test(04-06): add entity detail integrity regressions`
- GREEN commit: d51cd1f `feat(04-06): complete entity detail snapshots and validation`
- GREEN/security workflow commit: 88d129b `feat(04-06): verify deploy source sha checkout`
- Audit assertion commit: 379a74f `test(04-06): assert deploy checkout ref literally`

## Self-Check: PASSED

- Summary file created at `/Users/yiwei/ics/iait/.claude/worktrees/agent-a29b332f33ae01821/.planning/phases/04-automation-deployment/04-06-SUMMARY.md`.
- Verified task commits exist: `5c5b2e6`, `d51cd1f`, `88d129b`, `379a74f`.
- Verified modified files exist in the worktree.
