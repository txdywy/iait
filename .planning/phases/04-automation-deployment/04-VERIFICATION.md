---
phase: 04-automation-deployment
verified: 2026-05-08T14:24:08Z
status: gaps_found
score: 24/25 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 23/24
  gaps_closed:
    - "Scheduled no-change refreshes now complete successfully when scraper records hash-match existing metadata."
  gaps_remaining:
    - "Deployment safety after manual Data Pipeline workflow_dispatch is incomplete because deploy.yml accepts source_sha without verifying it is reachable from main."
  regressions: []
gaps:
  - truth: "Deploy Pages only publishes main-approved production source when invoked by Data Pipeline handoff."
    status: failed
    reason: "Manual Data Pipeline dispatch from a non-main ref can pass that ref's commit SHA to deploy.yml; deploy.yml checks out the SHA but does not verify it belongs to main."
    artifacts:
      - path: ".github/workflows/data-pipeline.yml"
        issue: "workflow_dispatch is unrestricted and dispatches deploy.yml with source_sha from the current checked-out ref."
      - path: ".github/workflows/deploy.yml"
        issue: "Verifies checked-out HEAD equals source_sha but does not verify source_sha is reachable from origin/main."
    missing:
      - "Fail Data Pipeline deployment path unless GITHUB_REF is refs/heads/main, or verify deploy inputs.source_sha is an ancestor of origin/main before build/publish."
      - "Add workflow contract tests proving non-main source_sha cannot deploy to Pages."
---

# Phase 4: Automation + Deployment Verification Report

**Phase Goal:** Pipeline runs automatically 4x/day, deploys to GitHub Pages, and serves last valid data when pipeline fails.  
**Verified:** 2026-05-08T14:24:08Z  
**Status:** gaps_found  
**Re-verification:** Yes — after gap closure plan 04-07

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | GitHub Actions workflow triggers at UTC 0/6/12/18 and can run manually | VERIFIED | `.github/workflows/data-pipeline.yml` defines the 4x/day cron schedule and `workflow_dispatch`. |
| 2 | Data workflow runs the full pipeline within a 15-minute job budget | VERIFIED | `.github/workflows/data-pipeline.yml` has `timeout-minutes: 15` and runs install, checks, staged pipeline, validation, snapshot, build, and bundle check. |
| 3 | Data workflow validates staged data before promotion | VERIFIED | Pipeline writes to staging, validates staging, and promotes only after validation succeeds. |
| 4 | Failed generation or validation preserves currently served root data | VERIFIED | Served `public/data` is copied to staging; root promotion only occurs after staged validation succeeds. |
| 5 | Successful changed-data pipeline runs commit generated data and dispatch Deploy Pages | VERIFIED | Commit step adds only generated data and dispatches `deploy.yml` after a successful generated-data push. |
| 6 | Generated public/data pushes do not recursively trigger Data Pipeline | VERIFIED | Data workflow push path filters do not include `public/data/**`. |
| 7 | Deploy workflow runs on push to main and workflow_dispatch | VERIFIED | `.github/workflows/deploy.yml` supports push/main and `workflow_dispatch`. |
| 8 | Deploy workflow validates current public/data before publishing | VERIFIED | Deploy build job checks out source, validates data, runs tests/build, uploads Pages artifact, then deploys. |
| 9 | Deploy handoff builds exactly source_sha when provided | VERIFIED | Deploy checkout uses `inputs.source_sha || github.sha` and verifies checked-out HEAD when `source_sha` is provided. |
| 10 | Deploy Pages only publishes main-approved production source when invoked by Data Pipeline handoff | FAILED | `deploy.yml` verifies checkout equality but does not prove `inputs.source_sha` is reachable from `origin/main`; a manual Data Pipeline run from a non-main ref can dispatch that SHA. |
| 11 | Dated snapshots include aggregate files and entity detail tree | VERIFIED | `scripts/snapshot-data.ts` recursively copies `dataDir/entities` into dated snapshots. |
| 12 | Snapshot manifest records entity-detail coverage | VERIFIED | Snapshot manifest records `entities/` when entity details are copied. |
| 13 | Data validation fails when latest references entities but entities/ is missing | VERIFIED | `scripts/validate-data.ts` rejects missing `entities/` when aggregate data contains entities. |
| 14 | Data validation fails when referenced entity detail files are missing | VERIFIED | Validator checks each latest entity has a matching `entities/{type}/{id}.json` detail file. |
| 15 | Scheduled no-change refreshes complete successfully | VERIFIED | `scripts/run-pipeline.ts` now logs unchanged hashes and continues to compile/metadata; regression test covers all-unchanged records. |
| 16 | True scraper failure/no-data cases still fail closed | VERIFIED | `scripts/run-pipeline.ts` still throws before compile/metadata when no scraper succeeds or no records are returned; tests cover both paths. |
| 17 | Workflows introduce no paid secrets, backend, or database assumptions | VERIFIED | Static audit found no paid secrets, backend, database, or external paid API assumptions in Phase 04 workflow/script changes. |

**Score:** 24/25 must-haves verified

## Latest Gap Re-check

| Prior Gap | Status | Evidence |
|---|---|---|
| Scheduled no-change refreshes fail when scrapers return records whose hashes match existing metadata | CLOSED | `scripts/run-pipeline.ts` no longer throws solely because `written === 0`; it logs unchanged hashes, calls `compile(dataDir)`, updates `meta.lastRun`, and writes `_pipeline-meta.json`. |
| True all-scraper-failed and zero-record runs must still fail closed | CLOSED | Existing guards and tests remain in place for no successful scrapers and zero returned records. |
| Deployment source SHA is honored by deploy workflow | CLOSED BUT INCOMPLETE | `deploy.yml` checks out and verifies `source_sha`, but does not verify that SHA is reachable from `main`. |

## Remaining Gap

### Deployment safety after manual workflow dispatch is not enforced

**Truth:** Deploy Pages only publishes main-approved production source when invoked by the Data Pipeline handoff.  
**Status:** FAILED / BLOCKER

`data-pipeline.yml` allows unrestricted manual `workflow_dispatch`, commits/pushes generated data on the currently selected ref, and dispatches `deploy.yml` with `source_sha` set to that ref's current `HEAD`. `deploy.yml` then checks out and verifies that exact SHA, but does not verify the SHA belongs to `origin/main` before building and publishing to GitHub Pages.

**Missing:**

- Fail the Data Pipeline deployment path unless `GITHUB_REF` is `refs/heads/main`, or verify in `deploy.yml` that `inputs.source_sha` is an ancestor of `origin/main` before build/publish.
- Add workflow contract tests proving a non-main `source_sha` cannot deploy to Pages.

## Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `.github/workflows/data-pipeline.yml` | 4x/day scheduled/manual/source-triggered data workflow with staged validation, snapshot, generated-data commit, deploy handoff | PARTIAL | Workflow is substantive and validates staged data, but manual non-main dispatch can still feed non-main source to Pages deployment. |
| `.github/workflows/deploy.yml` | GitHub Pages deploy workflow for push/manual/handoff with source_sha integrity | PARTIAL | `source_sha` is honored and checked for equality, but not checked for reachability from `main`. |
| `scripts/run-pipeline.ts` | Staging-compatible pipeline runner with fail-closed scraper errors and safe unchanged refreshes | VERIFIED | No-change successful scraper output proceeds to compile/metadata while true no-data/failure cases still fail closed. |
| `scripts/validate-data.ts` | Static data validation gate including latest-to-detail checks | VERIFIED WITH WARNING | Validates aggregate files and entity detail existence; still lacks its own unsafe entity-id path-segment rejection. |
| `scripts/snapshot-data.ts` | Dated snapshot creation with aggregate files, entity details, manifest, retention | VERIFIED | Copies aggregates and `entities/`, records manifest metadata, validates keep, and prunes manifest-listed snapshots only. |
| `package.json` | CI-callable pipeline, validation, snapshot scripts | VERIFIED | Defines pipeline, validation, and snapshot scripts used by workflows. |

## Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `data-pipeline.yml` | `scripts/run-pipeline.ts` | `COMPUTEATLAS_DATA_DIR=public/data-staging npm run pipeline` | WIRED | Staged data directory is used before root promotion. |
| `data-pipeline.yml` | `scripts/validate-data.ts` | `npm run data:validate:dir -- public/data-staging` and `npm run data:validate` | WIRED | Staged and promoted validation both run. |
| `data-pipeline.yml` | `scripts/snapshot-data.ts` | `npm run data:snapshot -- public/data` | WIRED | Snapshot is created after promotion and before commit. |
| `data-pipeline.yml` | `deploy.yml` | `gh workflow run deploy.yml --ref main -f source_sha=$(git rev-parse HEAD)` | PARTIAL | Handoff is wired, but `source_sha` is not proven to be from `main`. |
| `deploy.yml` | exact generated commit | checkout `ref: ${{ inputs.source_sha || github.sha }}` plus HEAD verification | PARTIAL | Source SHA is honored, but arbitrary non-main SHAs are still accepted. |
| `snapshot-data.ts` | `public/data/entities/**` | recursive `fs.cp` | WIRED | Entity detail tree is copied into each snapshot when present. |
| `validate-data.ts` | latest entity references | detail path existence checks | WIRED | Every valid latest entity must have `entities/{type}/{id}.json`. |
| `run-pipeline.ts` | `_pipeline-meta.json` | unchanged hashes log and continue to compile/metadata write | WIRED | No-change successful refreshes now update metadata instead of failing. |

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Post-merge build | `npm --prefix /Users/yiwei/ics/iait run build` | Vite build passed | PASS |
| Full test suite | `npm --prefix /Users/yiwei/ics/iait test` | 26 files, 216 tests passed | PASS |
| Phase 04 targeted verifier tests | `npm --prefix /Users/yiwei/ics/iait test -- scripts/__tests__/workflow-data-pipeline.test.ts scripts/__tests__/workflow-deploy.test.ts scripts/__tests__/snapshot-data.test.ts scripts/__tests__/validate-data.test.ts scripts/__tests__/run-pipeline.test.ts` | Verifier reported 5 files, 90 tests passed | PASS |
| Current static data validation | `npm --prefix /Users/yiwei/ics/iait run data:validate` | Verifier reported `[data:validate] OK: public/data` | PASS |
| TypeScript typecheck | `npm --prefix /Users/yiwei/ics/iait run typecheck` | Verifier reported pass | PASS |

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| INF-01 | 04-02, 04-05, 04-07 | GitHub Actions workflow runs data pipeline 4x/day | SATISFIED | Schedule exists and normal no-change scraper output now succeeds. |
| INF-02 | 04-02, 04-03, 04-04, 04-05, 04-06 | GitHub Actions deploys to GitHub Pages on push to main | PARTIAL / BLOCKED | Deploy workflow exists and honors `source_sha`, but manual Data Pipeline dispatch can still deploy a non-main source SHA. |
| INF-04 | 04-01, 04-02, 04-05, 04-06, 04-07 | GitHub Actions pipeline completes within 15 minutes per run | SATISFIED | Workflow timeout is 15 minutes; local targeted tests/typecheck pass. Actual hosted runtime still requires live observation. |
| INF-05 | 04-01, 04-02, 04-03, 04-04, 04-05, 04-07 | Pipeline errors do not block deployment; last valid data is served until new data succeeds | SATISFIED | Staging validation prevents failed generated data from promotion; true no-data/failure paths still fail before compile/metadata. |
| INF-06 | 04-01, 04-02, 04-04, 04-05, 04-06, 04-07 | Data versioning; each run commits dated snapshots to enable rollback | SATISFIED | Changed-data runs snapshot and commit `public/data`; no-change runs now reach snapshot/commit decision gates instead of failing early. |

## Anti-Patterns Found

| File | Pattern | Severity | Impact |
|---|---|---|---|
| `.github/workflows/data-pipeline.yml`, `.github/workflows/deploy.yml` | Manual Data Pipeline dispatch can feed non-main `source_sha` into production deploy | BLOCKER | Feature-branch source could be published to GitHub Pages without proving it is main-approved. |
| `scripts/validate-data.ts` | Entity id from `latest.json` interpolated into detail path without safe segment validation | WARNING | Malformed committed aggregate IDs could weaken detail-file existence validation. Pipeline-generated IDs are protected upstream. |
| `public/data/entities/country/be.json`, `br.json`, `tw.json` | Country display names are lower-case country codes | WARNING | Data quality/UI label issue, not the current automation/deployment blocker. |

## Human Verification Required

None for the current automated gate result. A live GitHub Actions run is still useful after fixing the blocker to confirm external Pages/workflow_dispatch behavior, but current codebase verification already found a blocking implementation gap.

## Gaps Summary

Plan 04-07 closed the prior no-change scheduled refresh blocker: stable upstream data no longer fails simply because all returned records hash-match existing metadata.

Phase 04 is still blocked because the deployment handoff does not prove a manually supplied `source_sha` is reachable from `main` before publishing to GitHub Pages.

---

_Verified: 2026-05-08T14:24:08Z_  
_Verifier: Claude (gsd-verifier)_
