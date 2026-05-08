---
phase: 04-automation-deployment
verified: 2026-05-08T00:44:15Z
status: human_needed
score: 16/16 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: human_needed
  previous_score: 16/16
  gaps_closed: []
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "GitHub Actions scheduled/manual data workflow and Pages deployment run in GitHub"
    expected: "A scheduled or manual Data Pipeline run commits and pushes generated public/data changes on success, then Deploy Pages publishes the validated Vite site to GitHub Pages. Failed/no-fresh-data pipeline runs do not update lastRun, commit, snapshot, push, or interrupt the previously deployed site."
    why_human: "GitHub Actions scheduling, GITHUB_TOKEN push behavior, and GitHub Pages publication are external service integrations; code and contract tests verify wiring, but an actual hosted run must be observed in GitHub."
---

# Phase 4: Automation + Deployment Verification Report

**Phase Goal:** Pipeline runs automatically 4x/day, deploys on push, and serves last valid data when pipeline fails
**Verified:** 2026-05-08T00:44:15Z
**Status:** human_needed
**Re-verification:** Yes — previous verification already had all codebase must-haves verified and external GitHub observation pending

## Goal Achievement

Phase 04 is implemented in the codebase. The roadmap contract and all PLAN frontmatter must-haves are satisfied by concrete workflow/script/test artifacts. Status remains `human_needed` only because GitHub Actions scheduling, `GITHUB_TOKEN` push behavior, and GitHub Pages publication require observation in GitHub.

### Observable Truths

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | GitHub Actions workflow triggers at UTC 0/6/12/18 and runs the full data pipeline | VERIFIED | `/Users/yiwei/ics/iait/.github/workflows/data-pipeline.yml` has schedule cron `0 0,6,12,18 * * *`, `workflow_dispatch`, source/config push paths, `timeout-minutes: 15`, and steps for `npm ci`, `npm test`, typecheck, staged pipeline, staged validation, promotion, snapshot, validation, geo prep, build, and bundle check. |
| 2 | Successful pipeline commits trigger automatic deployment to GitHub Pages | VERIFIED | Data workflow commit branch runs `git add public/data`, `git commit -m "data: refresh automated snapshot"`, then `git push`; deploy workflow triggers on every push to `main` with no `paths` or `paths-ignore` filter, so generated `public/data` pushes trigger deployment. |
| 3 | When the pipeline fails, the site continues serving the last valid dataset without interruption | VERIFIED | Workflow writes to `public/data-staging`, validates staging before promotion, and only commits after promotion/root validation/build checks. `runPipeline` throws `No fresh records produced` before `compile`, `lastRun`, snapshot, commit, or push when all scrapers fail, zero records are returned, or zero entities are written. Deploy validates committed `public/data` before build; failed validation blocks a new deploy, leaving prior Pages deployment served. |
| 4 | Each run commits a dated snapshot for versioning and rollback | VERIFIED | Data workflow runs `npm run data:snapshot -- public/data` after validated promotion and before `git add public/data`; `scripts/snapshot-data.ts` copies aggregate files into `public/data/snapshots/{snapshotId}/` and updates `manifest.json`; the commit step includes all `public/data` changes. |
| 5 | Pipeline completes within 15 minutes per run | VERIFIED | Data workflow job `refresh-data` has `timeout-minutes: 15`; `scripts/__tests__/workflow-data-pipeline.test.ts` asserts this invariant. |
| 6 | A failed pipeline run does not overwrite currently served public/data/latest.json, rankings.json, history.json, or _pipeline-meta.json | VERIFIED | Generation happens in `public/data-staging`; promotion to root `public/data` occurs only after `npm run data:validate:dir -- public/data-staging` succeeds. |
| 7 | A successful pipeline run produces a dated snapshot under public/data/snapshots/ for rollback | VERIFIED | `createSnapshot` writes sanitized snapshot directories and a newest-first `manifest.json` containing copied aggregate files. |
| 8 | Local verification can prove aggregate data validity before promotion | VERIFIED | `scripts/validate-data.ts` exports `validateDataDir` and validates latest, rankings, history, meta, index config, crossref, and entity detail files. Package scripts expose `data:validate` and `data:validate:dir`. |
| 9 | Source/config pushes can run data pipeline but generated public/data pushes cannot recursively run it | VERIFIED | Data workflow push `paths` include source/config inputs and omit `public/data/**`; deploy workflow has no path filter and therefore receives generated-data pushes. |
| 10 | Generated data commits avoid global CI suppression | VERIFIED | Data workflow commit message is `data: refresh automated snapshot`; workflow scan found no `[skip ci]`, `[ci skip]`, or `[skip actions]`. |
| 11 | Only validated generated data artifacts are committed | VERIFIED | Workflow commits only `git add public/data` after staged validation, promotion, root validation, build, and bundle check; no `git add .` or `git add -A` in the workflow. |
| 12 | Deploy workflow deploys static Vite site to Pages on push to main | VERIFIED | `/Users/yiwei/ics/iait/.github/workflows/deploy.yml` triggers on `push` to `main` and `workflow_dispatch`, uploads `dist`, and deploys via `actions/deploy-pages`. |
| 13 | Deployment uses Vite base `/iait/` and HashRouter-compatible output | VERIFIED | `/Users/yiwei/ics/iait/vite.config.ts` sets `base: '/iait/'`; `/Users/yiwei/ics/iait/src/app/router.tsx` uses `HashRouter` and not `BrowserRouter`. |
| 14 | Deployment validates current public/data before build | VERIFIED | Deploy workflow runs `npm run data:validate` before tests, typecheck, geo prep, build, bundle check, upload, and deploy. |
| 15 | Deploy workflow uses least-privilege Pages permissions and no secrets | VERIFIED | Deploy workflow grants `contents: read`, `pages: write`, and `id-token: write`; it does not grant `contents: write` and contains no `secrets.` references. |
| 16 | Privileged workflow actions are pinned to immutable SHAs and workflow contract tests cover automation/deploy invariants | VERIFIED | Both workflows use 40-character SHA-pinned `uses:` refs. `workflow-data-pipeline.test.ts` and `workflow-deploy.test.ts` assert trigger topology, permissions, no secrets, no mutable action refs, and deploy/data-pipeline compatibility. |

**Score:** 16/16 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `/Users/yiwei/ics/iait/.github/workflows/data-pipeline.yml` | Scheduled/manual/source-triggered safe data automation with staged generation, validation, snapshot, commit, and push | VERIFIED | Exists, substantive, wired to npm scripts; includes cron, 15-minute timeout, SHA-pinned actions, and `git push` only in successful commit branch. |
| `/Users/yiwei/ics/iait/.github/workflows/deploy.yml` | GitHub Pages deployment workflow for static Vite app | VERIFIED | Exists, substantive, wired to validation/build/upload/deploy steps; no path filters; least-privilege Pages permissions. |
| `/Users/yiwei/ics/iait/scripts/run-pipeline.ts` | Staging-compatible, fail-closed pipeline runner | VERIFIED | Exports `runPipeline`, `writeEntityIfChanged`, and `groupByEntity`; supports `COMPUTEATLAS_DATA_DIR`; rejects all-failed/zero-record/zero-written runs before compile/meta update. |
| `/Users/yiwei/ics/iait/scripts/validate-data.ts` | Static JSON validation gate | VERIFIED | Exports `validateDataDir`; validates required aggregate files, ISO timestamps, rankings, history series, entity detail files, config weights, and crossrefs. |
| `/Users/yiwei/ics/iait/scripts/snapshot-data.ts` | Dated snapshot creation for rollback/versioning | VERIFIED | Exports `createSnapshot`; copies required aggregate files, writes manifest, sanitizes IDs, and rejects invalid retention before pruning. |
| `/Users/yiwei/ics/iait/package.json` | CI-callable pipeline/validation/snapshot scripts | VERIFIED | Scripts include `pipeline`, `data:validate`, `data:validate:dir`, and `data:snapshot`. |
| `/Users/yiwei/ics/iait/scripts/__tests__/workflow-data-pipeline.test.ts` | Data workflow contract tests | VERIFIED | Covers schedule, source path topology, no generated recursion, permissions, timeout, staged commands, commit/push branch, no CI suppression, and SHA pinning. |
| `/Users/yiwei/ics/iait/scripts/__tests__/workflow-deploy.test.ts` | Deploy workflow contract tests | VERIFIED | Covers push/manual triggers, no path filters, permissions, validation/build/deploy commands, no secrets, SHA pinning, Vite base, and HashRouter. |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `data-pipeline.yml` | `scripts/run-pipeline.ts` | `COMPUTEATLAS_DATA_DIR=public/data-staging npm run pipeline` | WIRED | Package script `pipeline` runs `tsx scripts/run-pipeline.ts`; workflow runs it against staging. |
| `data-pipeline.yml` | `scripts/validate-data.ts` | `npm run data:validate:dir -- public/data-staging` and `npm run data:validate` | WIRED | Staging is validated before promotion; root data is validated before build/commit. |
| `data-pipeline.yml` | `scripts/snapshot-data.ts` | `npm run data:snapshot -- public/data` | WIRED | Snapshot occurs after validated promotion and before `git add public/data`. |
| `data-pipeline.yml` | `public/data` | `rsync -a --delete public/data-staging/ public/data/` after validation | WIRED | Promotion only happens after staged validation. |
| `data-pipeline.yml` | `deploy.yml` | `git push` after generated commit; deploy has push-to-main trigger with no path filter | WIRED | Manual verification overrides the SDK false negative for literal cross-file references: workflows do not reference each other by filename, but GitHub connects them through the pushed commit event. |
| `deploy.yml` | GitHub Pages | `actions/upload-pages-artifact` path `dist`, then `actions/deploy-pages` | WIRED | Deploy job needs build job and uses Pages environment. |
| `deploy.yml` | `vite.config.ts` / `src/app/router.tsx` | `npm run build` with Vite base and HashRouter | WIRED | Base path and hash routing verified in source and workflow tests. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|---|---|---|---|---|
| `scripts/run-pipeline.ts` | `records`, `freshRecords`, `written`, `meta.lastRun` | Registered scrapers via `discoverScrapers()` / `getScrapers()` | Yes when scrapers return records; otherwise fails closed before compile/meta update | FLOWING |
| `.github/workflows/data-pipeline.yml` | `public/data-staging` -> `public/data` | Staged pipeline output validated by `validate-data.ts` | Yes, only after successful pipeline and validation | FLOWING |
| `scripts/snapshot-data.ts` | Snapshot files and manifest entries | Validated root `public/data` aggregate files | Yes, copies concrete aggregate files and commits them through workflow | FLOWING |
| `.github/workflows/deploy.yml` | `dist` Pages artifact | `npm run build` after data validation/tests/typecheck | Yes, static Vite output from committed data and frontend | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Workflow contract tests | `npm test -- scripts/__tests__/workflow-data-pipeline.test.ts scripts/__tests__/workflow-deploy.test.ts` | 2 files / 13 tests passed during verification | PASS |
| Current committed public data validates | `npm run data:validate` | `[data:validate] OK: public/data` during verification | PASS |
| Full automated regression suite | `npm test -- --run` | Passed in orchestrator context: 26 files / 209 tests | PASS |
| TypeScript checks pass | `npm run typecheck` | Passed in orchestrator context | PASS |
| GitHub Actions and Pages hosted execution | Not run locally | Requires external GitHub observation | SKIP / HUMAN |

### Requirements Coverage

Note: `/Users/yiwei/ics/iait/.planning/REQUIREMENTS.md` is absent in this worktree. Requirement IDs were cross-referenced against `/Users/yiwei/ics/iait/REQUIREMENTS.md` and `/Users/yiwei/ics/iait/.planning/ROADMAP.md`; all user-requested Phase 04 IDs are accounted for.

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| INF-01 | 04-02 | GitHub Actions workflow runs data pipeline 4x/day (UTC 0/6/12/18) | SATISFIED | Data workflow has cron `0 0,6,12,18 * * *`, manual dispatch, source push paths, and full pipeline/test/build steps. |
| INF-02 | 04-02, 04-03, 04-04 | GitHub Actions deploys to GitHub Pages on push to main | SATISFIED | Deploy workflow runs on main pushes with no paths filter; data workflow successful commit branch runs `git push`, allowing generated-data commits to trigger deploy. |
| INF-04 | 04-01, 04-02 | GitHub Actions pipeline completes within 15 minutes per run (budget: 1800 min/month) | SATISFIED | Data workflow job has `timeout-minutes: 15`; workflow contract test asserts it. |
| INF-05 | 04-01, 04-02, 04-03, 04-04 | Pipeline errors do not block deployment — last valid data is served until new data succeeds | SATISFIED | Staged generation/validation prevents failed data from promoting; `runPipeline` fails before compile/meta update on all failures, zero records, or zero writes; deploy validates committed data before publishing. |
| INF-06 | 04-01, 04-02, 04-04 | Data versioning — each run commits dated snapshots to enable rollback | SATISFIED | Snapshot script creates dated snapshot directories and manifest; workflow snapshots after validation and includes `public/data/snapshots` in pushed `public/data` commit. |

No orphaned Phase 04 requirements were found beyond INF-01, INF-02, INF-04, INF-05, and INF-06.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---:|---|---|---|
| None blocking | - | - | - | Targeted scan found no TODO/FIXME/placeholder/not-implemented/empty-return blocker patterns in Phase 04 workflow and script scope. Console output is CLI logging, not stub behavior. |

### Human Verification Required

#### 1. GitHub Actions scheduled/manual pipeline and Pages deployment

**Test:** In GitHub, run or observe `/Users/yiwei/ics/iait/.github/workflows/data-pipeline.yml` via scheduled/manual dispatch on `main`; confirm a successful changed-data run creates and pushes `data: refresh automated snapshot`, then `/Users/yiwei/ics/iait/.github/workflows/deploy.yml` runs and publishes GitHub Pages.

**Expected:** Successful run pushes generated `public/data` including `snapshots/manifest.json` and a dated snapshot; Deploy Pages runs from that push and publishes `dist` to Pages.

**Why human:** GitHub Actions scheduling, `GITHUB_TOKEN` push permissions, and GitHub Pages publication are external service behavior that cannot be proven by local static code inspection.

#### 2. Failed/no-fresh-data run preserves the deployed site

**Test:** Observe a failing/no-fresh-data Actions run, or temporarily trigger a safe test branch scenario where scrapers fail or return unchanged data.

**Expected:** The data workflow fails before root metadata/snapshot/commit/push; no new deploy is triggered from generated data; the previous Pages deployment remains served.

**Why human:** Requires observing GitHub Actions and hosted Pages state.

### Gaps Summary

No codebase gaps remain. The only remaining gate is human observation of GitHub-hosted workflow and Pages execution.

---

_Verified: 2026-05-08T00:44:15Z_
_Verifier: Claude (gsd-verifier)_
