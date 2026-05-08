---
phase: 04-automation-deployment
verified: 2026-05-08T05:44:22Z
status: gaps_found
score: 23/24 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 20/23
  gaps_closed:
    - "Snapshots now copy public/data/entities/** into dated snapshots and record entities/ in the manifest."
    - "Data validation now fails when latest.json references entities but public/data/entities/ is missing."
    - "Data validation now fails when a latest.json entity lacks its corresponding entities/{type}/{id}.json detail file."
    - "Deploy Pages now checks out inputs.source_sha || github.sha and verifies checked-out HEAD when source_sha is provided."
  gaps_remaining:
    - "Scheduled no-change refreshes fail when scrapers return records whose hashes match existing metadata."
  regressions: []
gaps:
  - truth: "Scheduled 4x/day data pipeline runs can complete successfully for normal no-change upstream data."
    status: failed
    reason: "runPipeline throws when every scraper succeeds and returns records but all entity hashes match existing metadata, so a normal stable-data refresh fails before compile, snapshot, validation, commit, push, or deploy handoff."
    artifacts:
      - path: "scripts/run-pipeline.ts"
        issue: "Lines 140-142 throw `No fresh records produced` when `written === 0`, treating unchanged data as a failed pipeline run."
    missing:
      - "Treat successful scraper runs with unchanged hashes as a successful no-op or metadata-only refresh instead of a fatal pipeline error."
      - "Add/update tests proving all-unchanged scraper output does not fail the scheduled workflow path."
---

# Phase 4: Automation + Deployment Verification Report

**Phase Goal:** Pipeline runs automatically 4x/day, deploys on push, and serves last valid data when pipeline fails.
**Verified:** 2026-05-08T05:44:22Z
**Status:** gaps_found
**Re-verification:** Yes — after gap closure plan 04-06

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | GitHub Actions workflow triggers at UTC 0/6/12/18 and can run manually | VERIFIED | `.github/workflows/data-pipeline.yml` has cron `0 0,6,12,18 * * *` and `workflow_dispatch` at lines 4-6. |
| 2 | Data workflow runs the full pipeline within a 15-minute job budget | VERIFIED | `.github/workflows/data-pipeline.yml` has `timeout-minutes: 15` at line 30 and runs install, tests, typecheck, staged pipeline, validation, snapshot, build, and bundle check at lines 43-77. |
| 3 | Data workflow validates staged data before promotion | VERIFIED | Pipeline writes to staging at line 56, validates staging at line 59, and promotes only after validation at line 62. |
| 4 | Failed generation or validation preserves currently served root data | VERIFIED | Served `public/data` is copied to `public/data-staging`, pipeline runs against staging, and root promotion occurs only after `npm run data:validate:dir -- public/data-staging` succeeds. Failed earlier steps stop the job before `rsync -a --delete public/data-staging/ public/data/`. |
| 5 | Successful changed-data pipeline runs commit generated data and dispatch Deploy Pages | VERIFIED | Commit step adds only `public/data`, commits/pushes in the changed branch, emits `pushed=true`, and dispatches `deploy.yml` only when `steps.commit-generated-data.outputs.pushed == 'true'` at lines 84-105. |
| 6 | Generated public/data pushes do not recursively trigger Data Pipeline | VERIFIED | Data workflow push paths are source/config inputs only at lines 9-17 and do not include `public/data/**`; audit grep found no `public/data/**` in the workflow. |
| 7 | Deploy workflow runs on push to main and workflow_dispatch | VERIFIED | `.github/workflows/deploy.yml` has `push: branches: [main]` and `workflow_dispatch` at lines 3-19. |
| 8 | Deploy workflow validates current public/data before publishing | VERIFIED | Deploy build job checks out source, verifies requested SHA when supplied, then runs `npm run data:validate` before tests/build/upload at lines 34-81. |
| 9 | Deploy handoff builds exactly source_sha when provided | VERIFIED | Deploy checkout uses `ref: ${{ inputs.source_sha || github.sha }}` and the next step compares `git rev-parse HEAD` against `inputs.source_sha`, exiting non-zero on mismatch at lines 34-49. |
| 10 | Dated snapshots include aggregate files and entity detail tree | VERIFIED | `scripts/snapshot-data.ts` copies required aggregate files and recursively copies `dataDir/entities` into `snapshots/{snapshotId}/entities` with `fs.cp` at lines 100-107. |
| 11 | Snapshot manifest records entity-detail coverage | VERIFIED | Manifest entry includes `entities/` when entity directory copy succeeds via `ENTITY_DETAILS_MANIFEST_ENTRY` at lines 27 and 116-121. |
| 12 | Data validation fails when latest references entities but entities/ is missing | VERIFIED | `validateEntityFiles` pushes `entities directory is required when latest.json contains entities` on missing entities root when expected entities are non-empty at lines 222-232. |
| 13 | Data validation fails when referenced entity detail files are missing | VERIFIED | Validator loops over latest entities and pushes `Missing referenced entity detail file: entities/{type}/{id}.json` when the detail JSON is absent at lines 237-242. |
| 14 | Workflows introduce no paid secrets, backend, or database assumptions | VERIFIED | Static audit found no `secrets.`, database URLs, backend server assumptions, or paid API key references in Phase 04 workflows/scripts. |
| 15 | Scheduled no-change refreshes complete successfully | FAILED | `runPipeline` throws when `written === 0` at lines 140-142. If scrapers return valid records but hashes are unchanged, scheduled automation fails before compile/snapshot/deploy handoff. |

**Score:** 23/24 must-haves verified

## Previously Reported Gap Re-check

| Prior Gap | Status | Evidence |
|---|---|---|
| Snapshots omit `public/data/entities/**` | CLOSED | `scripts/snapshot-data.ts` now copies `entities` recursively with `fs.cp` and records `entities/` in manifest entries. |
| Validation passes when `entities/` is missing | CLOSED | `scripts/validate-data.ts` now emits `entities directory is required when latest.json contains entities`. |
| Validation passes when referenced detail files are missing | CLOSED | `scripts/validate-data.ts` now emits `Missing referenced entity detail file: entities/{type}/{id}.json`. |
| Deploy handoff sends but ignores `source_sha` | CLOSED | `.github/workflows/deploy.yml` checks out `inputs.source_sha || github.sha` and verifies `git rev-parse HEAD`. |

## Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `.github/workflows/data-pipeline.yml` | 4x/day scheduled/manual/source-triggered data workflow with staged validation, snapshot, generated data commit, deploy handoff | VERIFIED | Substantive workflow with pinned actions, no generated-data recursion, 15-minute timeout, validation-before-promotion, data-only commit, and conditional deploy dispatch. |
| `.github/workflows/deploy.yml` | GitHub Pages deploy workflow for push/manual/handoff with source_sha integrity | VERIFIED | Substantive workflow with push/main, workflow_dispatch inputs, Pages permissions, source SHA checkout/verification, validation/build/upload/deploy. |
| `scripts/run-pipeline.ts` | Staging-compatible pipeline runner with fail-closed scraper errors and safe entity writes | PARTIAL | Staging and path safety are implemented, but all-unchanged successful scraper output is treated as fatal. |
| `scripts/validate-data.ts` | Static data validation gate including latest-to-detail checks | VERIFIED | Validates aggregate files, current data shape, entity detail directory presence, and referenced detail file existence. |
| `scripts/snapshot-data.ts` | Dated snapshot creation with aggregate files, entity details, manifest, retention | VERIFIED | Copies aggregates and `entities/`, records manifest metadata, validates keep, prunes manifest-listed snapshots only. |
| `package.json` | CI-callable pipeline, validation, snapshot scripts | VERIFIED | Defines `pipeline`, `data:validate`, `data:validate:dir`, and `data:snapshot`. |

## Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `data-pipeline.yml` | `scripts/run-pipeline.ts` | `COMPUTEATLAS_DATA_DIR=public/data-staging npm run pipeline` | WIRED | Staged data directory is used before root promotion. |
| `data-pipeline.yml` | `scripts/validate-data.ts` | `npm run data:validate:dir -- public/data-staging` and `npm run data:validate` | WIRED | Staged and promoted validation both run. |
| `data-pipeline.yml` | `scripts/snapshot-data.ts` | `npm run data:snapshot -- public/data` | WIRED | Snapshot is created after promotion and before commit. |
| `data-pipeline.yml` | `deploy.yml` | `gh workflow run deploy.yml --ref main -f source_sha=$(git rev-parse HEAD)` | WIRED | Dispatch occurs only after successful generated-data push. |
| `deploy.yml` | exact generated commit | checkout `ref: ${{ inputs.source_sha || github.sha }}` plus HEAD verification | WIRED | Source SHA is honored and mismatch fails. |
| `snapshot-data.ts` | `public/data/entities/**` | recursive `fs.cp` | WIRED | Entity detail tree is copied into each snapshot when present. |
| `validate-data.ts` | latest entity references | detail path existence checks | WIRED | Every valid latest entity must have `entities/{type}/{id}.json`. |

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|---|---|---|---|---|
| `data-pipeline.yml` | generated `public/data` | `COMPUTEATLAS_DATA_DIR=public/data-staging npm run pipeline` -> validation -> `rsync` promotion | Yes, but no-change successful scraper data currently fails in `runPipeline` | PARTIAL |
| `snapshot-data.ts` | snapshot contents | Root `public/data` aggregate files plus `entities/` directory | Yes | VERIFIED |
| `validate-data.ts` | expected entity detail paths | `latest.json.entities` | Yes; derives paths and checks filesystem existence | VERIFIED |
| `deploy.yml` | deployed source tree | `inputs.source_sha || github.sha` checkout | Yes; verifies HEAD when source_sha supplied | VERIFIED |

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Phase 04 targeted tests pass | `npm --prefix /Users/yiwei/ics/iait test -- scripts/__tests__/workflow-data-pipeline.test.ts scripts/__tests__/workflow-deploy.test.ts scripts/__tests__/snapshot-data.test.ts scripts/__tests__/validate-data.test.ts scripts/__tests__/run-pipeline.test.ts` | 5 files, 89 tests passed | PASS |
| Current static data validates | `npm --prefix /Users/yiwei/ics/iait run data:validate` | `[data:validate] OK: public/data` | PASS |
| TypeScript accepts scripts/workflows tests | `npm --prefix /Users/yiwei/ics/iait run typecheck` | exited 0 | PASS |

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| INF-01 | 04-02, 04-05, 04-06 | GitHub Actions workflow runs data pipeline 4x/day (UTC 0/6/12/18) | PARTIAL | Schedule exists, but normal no-change scraper output currently fails `runPipeline`, so scheduled refreshes can fail despite healthy upstream data. |
| INF-02 | 04-02, 04-03, 04-04, 04-05, 04-06 | GitHub Actions deploys to GitHub Pages on push to main | SATISFIED | Deploy workflow triggers on push/main and workflow_dispatch; data pipeline explicitly dispatches deploy after generated-data push; source_sha is checked out and verified. |
| INF-04 | 04-01, 04-02, 04-05, 04-06 | GitHub Actions pipeline completes within 15 minutes per run | SATISFIED | Data workflow job has `timeout-minutes: 15`; targeted tests/typecheck pass locally. Actual runtime still needs observation in GitHub Actions. |
| INF-05 | 04-01, 04-02, 04-03, 04-04, 04-05, 04-06 | Pipeline errors do not block deployment — last valid data is served until new data succeeds | SATISFIED | Staging validation prevents failed generated data from promotion; deploy validates committed data before publish; failed workflow leaves previous Pages deployment serving. |
| INF-06 | 04-01, 04-02, 04-04, 04-05, 04-06 | Data versioning — each run commits dated snapshots to enable rollback | PARTIAL | Changed-data successful runs snapshot and commit `public/data`; snapshots are complete. However no-change scheduled refreshes fail before snapshot, so “each run” is not fully true. |

No orphaned Phase 4 requirements were found beyond INF-01, INF-02, INF-04, INF-05, and INF-06 in `/Users/yiwei/ics/iait/REQUIREMENTS.md`.

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---:|---|---|---|
| `scripts/run-pipeline.ts` | 140-142 | Throws on `written === 0` | BLOCKER | A normal stable upstream/no-change refresh becomes a failed scheduled pipeline run. |
| `scripts/validate-data.ts` | 237-241 | Entity id from `latest.json` interpolated into detail path without safe segment validation | WARNING | Malformed committed aggregate IDs could weaken detail-file existence validation. Pipeline-generated IDs are protected by `run-pipeline.ts`, so this is not the current phase blocker. |
| `public/data/entities/country/be.json`, `br.json`, `tw.json` | n/a | Country display names are lower-case country codes | WARNING | Data quality/UI label issue, not an automation/deployment goal blocker. |

Console output in CLI scripts is expected operational logging, not a stub.

## Human Verification Required

None required for the automated gate result. A live GitHub Actions run is still useful after fixing the blocker to confirm external Pages/workflow_dispatch behavior in GitHub, but current codebase verification already found a blocking local implementation gap.

## Gaps Summary

The three previous Phase 04 verification gaps are closed in code: snapshots include entity details, validation fails on missing entity detail data, and Deploy Pages binds workflow_dispatch builds to `source_sha`.

Phase 04 is still blocked because scheduled no-change refreshes are treated as failed pipeline runs. Since 4x/day unattended automation must tolerate stable upstream data, `runPipeline` should not fail solely because all returned records hash-match existing metadata.

---

_Verified: 2026-05-08T05:44:22Z_
_Verifier: Claude (gsd-verifier)_
