---
phase: 04-automation-deployment
verified: 2026-05-08T06:50:25Z
status: passed
score: 25/25 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 24/25
  gaps_closed:
    - "Deploy Pages now rejects workflow_dispatch source_sha values that are not reachable from origin/main before validation, build, artifact upload, or Pages deploy."
  gaps_remaining: []
  regressions: []
---

# Phase 4: Automation + Deployment Verification Report

**Phase Goal:** Pipeline runs automatically 4x/day, deploys to GitHub Pages, and serves last valid data when pipeline fails.  
**Verified:** 2026-05-08T06:50:25Z  
**Status:** passed  
**Re-verification:** Yes — after gap closure plan 04-08

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | GitHub Actions workflow triggers at UTC 0/6/12/18 and can run manually | VERIFIED | `.github/workflows/data-pipeline.yml` defines cron `0 0,6,12,18 * * *` and `workflow_dispatch`. |
| 2 | Source/config pushes that affect data generation can run the data pipeline, but generated `public/data` pushes cannot recursively run it | VERIFIED | Data workflow push paths include workflow/scripts/source/config files and omit `public/data/**`; contract tests assert the anti-recursion topology. |
| 3 | Data workflow runs the full pipeline within a 15-minute job budget | VERIFIED | `.github/workflows/data-pipeline.yml` sets `timeout-minutes: 15` and runs install, tests, typecheck, staged pipeline, staged validation, promotion, snapshot, promoted validation, geo preparation, build, and bundle check. |
| 4 | Data workflow validates staged data before promotion | VERIFIED | Workflow runs `COMPUTEATLAS_DATA_DIR=public/data-staging npm run pipeline`, then `npm run data:validate:dir -- public/data-staging`, then promotes with `rsync -a --delete public/data-staging/ public/data/`. |
| 5 | Failed generation or validation preserves currently served root data | VERIFIED | Served `public/data` is copied into staging first; root promotion, snapshot, commit, push, and deploy handoff occur only after staged pipeline and staged validation succeed. |
| 6 | Successful changed-data pipeline runs commit generated data and dispatch Deploy Pages | VERIFIED | Commit step adds `public/data`, pushes changed generated data, sets `pushed=true`, and dispatches `deploy.yml` only under `if: steps.commit-generated-data.outputs.pushed == 'true'`. |
| 7 | Generated public/data pushes do not recursively trigger Data Pipeline | VERIFIED | Data workflow push path filters omit `public/data/**`, and contract tests assert no dispatch targets `data-pipeline.yml`. |
| 8 | Deploy workflow runs on push to main and workflow_dispatch | VERIFIED | `.github/workflows/deploy.yml` defines `push` on `main` plus `workflow_dispatch` with `source`, `source_run_id`, and `source_sha` inputs. |
| 9 | Deploy workflow validates current public/data before publishing | VERIFIED | Deploy build job runs checkout, source SHA guards, `npm run data:validate`, tests, typecheck, geo preparation, build, bundle check, artifact upload, then Pages deploy. |
| 10 | Deploy handoff builds exactly `source_sha` when provided | VERIFIED | Checkout uses `ref: ${{ inputs.source_sha || github.sha }}` and `Verify requested source SHA` compares `git rev-parse HEAD` with `inputs.source_sha`. |
| 11 | Deploy Pages workflow_dispatch with `source_sha` only publishes commits reachable from `origin/main` | VERIFIED | `.github/workflows/deploy.yml` fetches `origin main` and runs `git merge-base --is-ancestor "$REQUESTED_SHA" origin/main`; failure exits before Node setup, data validation, build, artifact upload, or Pages deploy. |
| 12 | Data Pipeline handoff cannot publish a feature-branch source_sha to GitHub Pages | VERIFIED | The Deploy Pages ancestry guard rejects any dispatched `source_sha` not reachable from `origin/main`; `scripts/__tests__/workflow-deploy.test.ts` asserts this guard and its ordering before build/publish. |
| 13 | Deploy push-to-main behavior remains intact for normal production deployments | VERIFIED | Push trigger on `main` remains present; the ancestry guard is conditional on `inputs.source_sha != ''`, so normal push deployments use `github.sha` and continue through validation/build/deploy. |
| 14 | Dated snapshots include aggregate files and entity detail tree | VERIFIED | `scripts/snapshot-data.ts` copies required aggregate files and recursively copies `dataDir/entities` into each snapshot when present. |
| 15 | Snapshot manifest records entity-detail coverage | VERIFIED | Snapshot manifest writes `entities/` in `files` when entity details are copied; tests verify manifest coverage. |
| 16 | Data validation fails when latest references entities but entities/ is missing | VERIFIED | `validateEntityFiles` reports `entities directory is required when latest.json contains entities`; regression test covers this. |
| 17 | Data validation fails when referenced entity detail files are missing | VERIFIED | Validator checks each valid latest entity has `entities/{type}/{id}.json`; regression test covers missing detail file errors. |
| 18 | Scheduled no-change refreshes complete successfully | VERIFIED | `scripts/run-pipeline.ts` treats unchanged hashes as skips, continues to `compile(dataDir)`, updates `meta.lastRun`, and writes `_pipeline-meta.json`; regression test passes. |
| 19 | Successful scraper runs whose hashes match existing metadata are not fatal | VERIFIED | `writeEntityIfChanged` returns false on hash match; `runPipeline` logs no changed hashes and still completes when scraper output contained records. |
| 20 | True scraper failure/no-data cases still fail closed | VERIFIED | `runPipeline` throws before compile/metadata when `successfulScrapers === 0` or `freshRecords === 0`; tests cover all-scraper-failed and zero-record cases. |
| 21 | External scraper-provided entity IDs and entity types cannot write outside entity directories or merge conflicting types under one ID | VERIFIED | `assertSafePathSegment`, `assertEntityType`, resolved path containment checks, and conflicting-type checks protect entity writes; tests cover unsafe IDs. |
| 22 | Snapshot retention rejects invalid keep values and cannot prune every snapshot through invalid retention | VERIFIED | `createSnapshot` requires positive integer `keep`; tests cover zero, negative, and `NaN`. |
| 23 | Data validation rejects malformed latest timestamps and malformed history series content before deploy or commit | VERIFIED | `validate-data.ts` validates canonical ISO timestamps, history series score/confidence/factors; tests cover malformed cases. |
| 24 | Workflows introduce no paid secrets, backend, or database assumptions | VERIFIED | Static workflow/script audit found no `secrets.*` references in deploy workflow, no database/backend services, and no paid API key assumptions in Phase 04 automation. |
| 25 | All privileged workflow actions are pinned to immutable SHAs and least-privilege permissions are used | VERIFIED | `data-pipeline.yml` and `deploy.yml` pin action references to 40-character SHAs; deploy permissions are `contents: read`, `pages: write`, `id-token: write`; data pipeline uses `contents: write`, `actions: write` for generated commits and deploy dispatch. |

**Score:** 25/25 must-haves verified

## Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `.github/workflows/data-pipeline.yml` | Scheduled/manual/source-triggered data workflow with staged validation, snapshot, generated-data commit, deploy handoff, no recursion, 15-minute timeout | VERIFIED | Substantive workflow exists and is wired to pipeline, validation, snapshot, build, bundle check, commit, push, and deploy dispatch. |
| `.github/workflows/deploy.yml` | GitHub Pages deploy workflow for push/manual/handoff with `source_sha` integrity and main ancestry guard | VERIFIED | `source_sha` is honored, checked for exact checkout equality, and checked as reachable from `origin/main` before any build/publish steps. |
| `scripts/run-pipeline.ts` | Staging-compatible pipeline runner with fail-closed scraper errors, safe entity writes, and unchanged-refresh success | VERIFIED | Uses `COMPUTEATLAS_DATA_DIR`, safe segment/type validation, fail-closed no-data guards, compile/metadata after successful unchanged records. |
| `scripts/validate-data.ts` | Static data validation gate for aggregate data and entity detail existence/schema | VERIFIED WITH WARNING | Validates required aggregate files, timestamps, history/rankings/meta/config/crossref, entity detail schema, and latest-to-detail existence. Warning: latest entity IDs are still interpolated into paths without a validator-local safe path-segment check. |
| `scripts/snapshot-data.ts` | Dated snapshot creation with aggregate files, entity details, manifest, duplicate protection, retention | VERIFIED | Copies aggregates and `entities/`, records manifest metadata, rejects invalid keep, prevents duplicate snapshot overwrite, and prunes manifest-listed snapshots only. |
| `package.json` | CI-callable pipeline, validation, snapshot, build, typecheck, test scripts | VERIFIED | Defines `pipeline`, `data:validate`, `data:validate:dir`, `data:snapshot`, `build`, `typecheck`, and `test` scripts used by workflows and verification. |
| `scripts/__tests__/workflow-deploy.test.ts` | Deploy workflow contract tests including source_sha ancestry guard | VERIFIED | Tests assert `origin/main` reachability guard and guard ordering before setup/build/upload/deploy. |
| `scripts/__tests__/workflow-data-pipeline.test.ts` | Data workflow contract tests for schedule, paths, dispatch, permissions, pinned actions | VERIFIED | Tests assert deploy dispatch only after generated-data push and anti-recursion topology. |
| `scripts/__tests__/snapshot-data.test.ts` | Snapshot regression tests | VERIFIED | Tests cover aggregate copy, entity detail copy, manifest entry, duplicate protection, invalid keep, and safe pruning. |
| `scripts/__tests__/validate-data.test.ts` | Data validation regression tests | VERIFIED | Tests cover required aggregate files, missing entities directory, missing detail file, timestamps, history, rankings, meta/config/crossref, and entity detail validation. |
| `scripts/__tests__/run-pipeline.test.ts` | Pipeline regression tests | VERIFIED | Tests cover safe writes, fail-closed no-data cases, environment data dir, unchanged-refresh success, and partial scraper failure success. |

## Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `data-pipeline.yml` | `scripts/run-pipeline.ts` | `COMPUTEATLAS_DATA_DIR=public/data-staging npm run pipeline` | WIRED | Pipeline executes against staging data before root promotion. |
| `data-pipeline.yml` | `scripts/validate-data.ts` | `npm run data:validate:dir -- public/data-staging` and `npm run data:validate` | WIRED | Staged data and promoted root data are both validated. |
| `data-pipeline.yml` | `scripts/snapshot-data.ts` | `npm run data:snapshot -- public/data` | WIRED | Snapshot runs after validation/promotion and before generated-data commit. |
| `data-pipeline.yml` | `.github/workflows/deploy.yml` | `gh workflow run deploy.yml --ref main -f source_sha=$(git rev-parse HEAD)` | WIRED | Handoff runs only after successful generated-data push; deploy workflow now validates the supplied SHA is on main. |
| `deploy.yml` | exact generated commit | checkout `inputs.source_sha || github.sha` plus HEAD equality verification | WIRED | Provided `source_sha` is the checkout target and must equal checked-out HEAD. |
| `deploy.yml` | `origin/main` | `git fetch --no-tags --prune origin main:refs/remotes/origin/main` and `git merge-base --is-ancestor` | WIRED | Non-main dispatched SHAs fail before build/publish. |
| `deploy.yml` | GitHub Pages | validate/test/typecheck/prepare/build/bundle/upload/deploy sequence | WIRED | Pages artifact is created from validated static output and deployed through `actions/deploy-pages`. |
| `snapshot-data.ts` | `public/data/entities/**` | recursive `fs.cp` into snapshots | WIRED | Entity detail tree is copied into each snapshot when present. |
| `validate-data.ts` | latest entity references | detail path existence checks and entity detail schema validation | WIRED | Each latest entity with a valid type must have a matching detail file, and every detail file is schema checked. |
| `run-pipeline.ts` | `_pipeline-meta.json` | hash skip handling, compile, `meta.lastRun`, metadata write | WIRED | No-change successful refreshes update metadata while true no-data failures do not. |

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|---|---|---|---|---|
| `.github/workflows/data-pipeline.yml` | Generated static `public/data` files | Scraper output through `scripts/run-pipeline.ts`, staged validation, promotion, snapshot, commit | Yes | FLOWING |
| `.github/workflows/deploy.yml` | Published static site artifact | Checked-out main/reachable source, committed `public/data`, Vite build output `dist` | Yes | FLOWING |
| `scripts/run-pipeline.ts` | Entity records and `_pipeline-meta.json` | Registered scrapers via `discoverScrapers()` / `getScrapers()` | Yes | FLOWING |
| `scripts/snapshot-data.ts` | Snapshot directory and manifest | Current validated `public/data` aggregate files plus `entities/` tree | Yes | FLOWING |
| `scripts/validate-data.ts` | Validation result | Actual filesystem JSON under selected data directory | Yes | FLOWING |

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Phase 04 targeted verifier tests | `npm --prefix /Users/yiwei/ics/iait test -- scripts/__tests__/workflow-deploy.test.ts scripts/__tests__/workflow-data-pipeline.test.ts scripts/__tests__/snapshot-data.test.ts scripts/__tests__/validate-data.test.ts scripts/__tests__/run-pipeline.test.ts` | 5 files, 91 tests passed | PASS |
| Current static data validation | `npm --prefix /Users/yiwei/ics/iait run data:validate` | `[data:validate] OK: public/data` | PASS |
| TypeScript typecheck | `npm --prefix /Users/yiwei/ics/iait run typecheck` | Command exited successfully | PASS |
| Orchestrator post-merge build | `npm --prefix /Users/yiwei/ics/iait run build` | Reported passed by orchestrator | PASS |
| Orchestrator full test suite | `npm --prefix /Users/yiwei/ics/iait test` | Reported passed by orchestrator: 26 files / 217 tests | PASS |
| Orchestrator schema drift gate | schema drift gate | Reported `drift_detected=false` | PASS |

## Requirements Coverage

`/Users/yiwei/ics/iait/.planning/REQUIREMENTS.md` does not exist, so full requirement descriptions could not be cross-referenced from that file. Requirement IDs were extracted from Phase 04 PLAN frontmatter and checked against code evidence.

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| INF-01 | 04-02, 04-05, 04-06, 04-07 | GitHub Actions workflow runs data pipeline 4x/day | SATISFIED | Data workflow cron schedule is `0 0,6,12,18 * * *`; no-change scheduled refresh path now succeeds. |
| INF-02 | 04-02, 04-03, 04-04, 04-05, 04-06, 04-08 | GitHub Actions deploys to GitHub Pages on push to main and safe handoff | SATISFIED | Deploy workflow runs on push/main and workflow_dispatch, validates/builds/uploads/deploys, honors `source_sha`, and rejects source SHAs not reachable from `origin/main`. |
| INF-04 | 04-01, 04-02, 04-05, 04-06, 04-07 | GitHub Actions pipeline completes within 15 minutes per run | SATISFIED | Data workflow has `timeout-minutes: 15`; targeted tests/typecheck pass locally. Live hosted duration is external but workflow budget is implemented. |
| INF-05 | 04-01, 04-02, 04-03, 04-04, 04-05, 04-07 | Pipeline errors do not block deployment; last valid data is served until new data succeeds | SATISFIED | Staging validation prevents failed generated data from promotion; deploy validates committed data before publishing; failure leaves previous Pages deployment served. |
| INF-06 | 04-01, 04-02, 04-04, 04-05, 04-06, 04-07 | Data versioning; each changed run commits dated snapshots for rollback | SATISFIED | Snapshot script creates dated snapshots with aggregates and entity details; data workflow snapshots validated data before committing generated changes. |

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---:|---|---|---|
| `scripts/validate-data.ts` | 237-241 | Entity id from `latest.json` interpolated into `entities/${entity.type}/${entityId}.json` without validator-local safe segment validation | WARNING | Malformed committed aggregate IDs could weaken detail-file existence validation. Pipeline-generated IDs are protected upstream by `run-pipeline.ts`; current data validation passes. |
| `public/data/entities/country/be.json`, `public/data/entities/country/br.json`, `public/data/entities/country/tw.json` | 9, 23 | Country display names are lower-case country codes | WARNING | Data quality/UI label issue from advisory review; not an automation/deployment goal blocker. |
| `scripts/run-pipeline.ts`, `scripts/validate-data.ts`, `scripts/snapshot-data.ts` | multiple | CLI `console.log` status output | INFO | Expected CLI logging, not a stub or placeholder implementation. |

## Human Verification Required

None. The remaining external behavior worth observing is a live GitHub Actions/Pages run after merge, but the codebase-level must-haves are implemented and covered by workflow contract tests. No human-only visual/user-flow assertion is required for this automation/deployment phase.

## Gaps Summary

No blocking gaps remain. The previous blocker was closed: Deploy Pages now verifies that a dispatched `source_sha` is reachable from `origin/main` before validation, build, artifact upload, or GitHub Pages deployment, preventing feature-branch source publication through the Data Pipeline handoff.

Warnings remain from the advisory review around validator-local unsafe latest entity IDs and three country display names, but these do not objectively prevent Phase 04's automation/deployment goal from being achieved.

---

_Verified: 2026-05-08T06:50:25Z_  
_Verifier: Claude (gsd-verifier)_
