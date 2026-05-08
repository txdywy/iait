---
phase: 04-automation-deployment
verified: 2026-05-08T00:00:00Z
status: gaps_found
score: 20/23 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: human_needed
  previous_score: 16/16
  gaps_closed:
    - "Explicit Deploy Pages workflow_dispatch handoff added after successful generated-data push."
  gaps_remaining:
    - "Snapshots omit public/data/entities/** detail files."
    - "Data validation can pass when entity detail files are missing."
    - "Deploy handoff sends source_sha but deploy.yml does not check out or verify it."
  regressions: []
gaps:
  - truth: "Each run commits a dated snapshot for versioning and rollback"
    status: failed
    reason: "Snapshots copy aggregate files only and omit public/data/entities/**, so rollback snapshots cannot restore the complete static dataset."
    artifacts:
      - path: "scripts/snapshot-data.ts"
        issue: "SNAPSHOT_FILES excludes entities/ and createSnapshot does not copy entity detail files."
    missing:
      - "Copy public/data/entities/** into each dated snapshot."
      - "Record entities/ in snapshot manifest or include copied entity file paths."
      - "Add tests proving entity details are included in snapshots."
  - truth: "Deployment validates generated/current public/data before build so only safe generated data is published"
    status: failed
    reason: "validateEntityFiles silently succeeds when entities/ is missing, allowing aggregate-only datasets to pass validation despite broken detail JSON paths."
    artifacts:
      - path: "scripts/validate-data.ts"
        issue: "validateEntityFiles returns on ENOENT for entities/ without checking latest.json referenced entities."
    missing:
      - "Fail validation when latest.json contains entities and entities/ is absent."
      - "Validate every latest entity has a corresponding entities/{type}/{id}.json detail file."
      - "Add missing-entities and missing-detail-file tests."
  - truth: "Successful changed-data Data Pipeline run deploys the refreshed generated commit through the explicit Deploy Pages handoff"
    status: partial
    reason: "The handoff sends source_sha, but deploy.yml ignores it during checkout, so dispatch may build a different main commit if main advances."
    artifacts:
      - path: ".github/workflows/deploy.yml"
        issue: "workflow_dispatch input source_sha is declared but not used in actions/checkout."
    missing:
      - "Checkout inputs.source_sha when provided, falling back to github.sha."
      - "Optionally verify checked-out HEAD equals source_sha."
      - "Add workflow contract tests for source_sha checkout/verification."
---

# Phase 4: Automation + Deployment Verification Report

**Phase Goal:** Pipeline runs automatically 4x/day, deploys on push or supported handoff, and serves last valid data when pipeline fails.
**Verified:** 2026-05-08T00:00:00Z
**Status:** gaps_found
**Score:** 20/23 must-haves verified

## Verification Mode

Re-verification after Phase 04 gap-closure plan `04-05`. The explicit Deploy Pages handoff gap discovered during UAT is now implemented, but the latest code review and verifier pass found three remaining safe-publication/versioning gaps that block full Phase 04 completion.

## Automated Checks

Passed:

- `npm test -- scripts/__tests__/workflow-data-pipeline.test.ts scripts/__tests__/workflow-deploy.test.ts scripts/__tests__/run-pipeline.test.ts scripts/__tests__/snapshot-data.test.ts scripts/__tests__/validate-data.test.ts`
- `npm run data:validate`
- `npm run typecheck`
- `npm run build && npm run bundle:check`

The orchestrator also ran:

- `npm test` — 26 files, 211 tests passed
- `npm run build` — production build passed with existing Vite chunk-size warning
- `npm run data:validate` — `[data:validate] OK: public/data`

## Gaps Found

### 1. Snapshot rollback is incomplete because snapshots omit entity detail files

**Truth failed:** Each run commits a dated snapshot for versioning and rollback.

**Classification:** BLOCKER

**Evidence:**

- `scripts/snapshot-data.ts` copies only aggregate files into each snapshot:
  - `latest.json`
  - `rankings.json`
  - `history.json`
  - `_pipeline-meta.json`
  - `index-config.json`
  - `entity-crossref.json`
- It does not copy `public/data/entities/**`.
- Current project data includes entity detail files under `public/data/entities`.

**Why this blocks the goal:**

INF-06 requires dated snapshots to enable rollback. A snapshot without entity detail JSON cannot restore the complete validated static dataset used by frontend drill-down/detail views.

**Missing:**

- Update `scripts/snapshot-data.ts` to copy `entities/` into each snapshot.
- Update snapshot manifest to record `entities/` or included entity file paths.
- Add tests in `scripts/__tests__/snapshot-data.test.ts` proving entity details are included.

### 2. Data validation can pass when entity detail files are missing

**Truth failed:** Deployment validates generated/current `public/data` before build so only safe generated data is published.

**Classification:** BLOCKER

**Evidence:**

- `scripts/validate-data.ts` has `validateEntityFiles(dataDir, errors)`.
- If `entities/` is missing, it silently returns success on `ENOENT`.
- Therefore a generated dataset can contain valid aggregate files while omitting detail files, and `npm run data:validate` can still pass.

**Why this blocks the goal:**

ComputeAtlas serves static JSON with no backend fallback. Missing entity detail files would deploy broken drill-down JSON paths while validation still reports success.

**Missing:**

- Require `entities/` when `latest.json.entities` is non-empty.
- Verify every latest entity has a corresponding detail file under `entities/{type}/{id}.json`.
- Add tests in `scripts/__tests__/validate-data.test.ts` for missing `entities/` and missing referenced detail files.

### 3. Deploy handoff accepts `source_sha` but does not check out or verify it

**Truth failed:** A successful changed-data Data Pipeline run deploys the refreshed generated data through the explicit handoff.

**Classification:** WARNING / potentially BLOCKER for strict safe-publication semantics

**Evidence:**

- `.github/workflows/data-pipeline.yml` dispatches Deploy Pages with `-f source_sha="$(git rev-parse HEAD)"`.
- `.github/workflows/deploy.yml` declares `source_sha`, but the checkout step ignores it.
- No `with.ref: ${{ inputs.source_sha || github.sha }}` or post-checkout SHA verification exists.

**Why this matters:**

The explicit dispatch handoff exists and addresses the UAT-discovered `GITHUB_TOKEN` push cascade issue. However, the Deploy Pages workflow may build the current `main` ref at dispatch execution time rather than the exact generated-data commit requested by Data Pipeline. If `main` advances between push/dispatch and checkout, the deployed commit can differ from `source_sha`.

**Missing:**

- Use `source_sha` in checkout when provided.
- Optionally add a verification step that fails if `git rev-parse HEAD` does not match `inputs.source_sha`.
- Extend `scripts/__tests__/workflow-deploy.test.ts` to enforce this.

## Verified Must-Haves

The following major Phase 04 requirements are verified in code:

- **INF-01:** `.github/workflows/data-pipeline.yml` schedules UTC `0/6/12/18`.
- **INF-02:** `.github/workflows/deploy.yml` deploys on push to `main`, and `.github/workflows/data-pipeline.yml` explicitly dispatches `deploy.yml` after successful generated-data push.
- **INF-04:** Data pipeline job has `timeout-minutes: 15`.
- **INF-05:** Pipeline uses staging and validates before promotion; deploy validates before build.
- **INF-06:** Snapshot script and workflow exist, but rollback completeness fails because `entities/**` is omitted.

## UAT Gap Re-check

The UAT issue reported that Data Pipeline run `25530872617` succeeded and pushed commit `1e041e8`, but no Deploy Pages run was created. This specific gap is addressed by plan `04-05`:

- Data Pipeline now has `actions: write` permission.
- `Commit generated data` has `id: commit-generated-data` and emits `pushed=true` only after `git push`.
- A separate `Dispatch Deploy Pages` step runs only when `steps.commit-generated-data.outputs.pushed == 'true'`.
- The dispatch command targets `deploy.yml` on `main` with `source`, `source_run_id`, and `source_sha` metadata.
- Data Pipeline push paths still omit `public/data/**`, preventing recursive generated-data pipeline runs.

## Result

Phase 04 is not complete. The deploy handoff gap is closed, but safe data publication and rollback guarantees still have unresolved code gaps.

## Next Step

Create gap-closure plan(s) from this report:

```bash
/gsd-plan-phase 04 --gaps
```
