---
phase: 04-automation-deployment
verified: 2026-05-07T00:00:00Z
status: gaps_found
score: 11/16
requirements:
  INF-01: verified
  INF-02: partial_blocked
  INF-04: verified
  INF-05: failed
  INF-06: failed
gaps:
  - truth: "Successful pipeline commits trigger automatic deployment to GitHub Pages"
    status: failed
    reason: "The data pipeline workflow commits generated data locally but never pushes the commit, so scheduled/manual refreshes are discarded and cannot trigger deploy.yml."
    artifacts:
      - path: ".github/workflows/data-pipeline.yml"
        issue: "Commit step exists but no git push step follows it."
      - path: "scripts/__tests__/workflow-data-pipeline.test.ts"
        issue: "Contract tests do not assert that generated data commits are pushed."
    missing:
      - "Add git push after a successful generated-data commit."
      - "Add workflow contract coverage requiring push behavior."
  - truth: "When the pipeline fails, the site continues serving the last valid dataset without interruption"
    status: failed
    reason: "Scraper failures are caught and logged without failing the pipeline; with existing metadata, all scraper failures can still compile, update lastRun, validate, snapshot, and commit stale data as fresh."
    artifacts:
      - path: "scripts/run-pipeline.ts"
        issue: "Scraper failures are swallowed in the scraper loop and do not prevent metadata refresh."
      - path: "scripts/__tests__/run-pipeline.test.ts"
        issue: "No test covers all scrapers failing with existing metadata."
    missing:
      - "Track scraper failure count and fresh record count."
      - "Refuse to compile/update lastRun when all scrapers fail or no fresh records are produced."
      - "Add tests for all-failed and partially-failed scraper behavior."
  - truth: "Each run commits a dated snapshot for versioning and rollback"
    status: failed
    reason: "Snapshots are created and included in local commits, but the workflow never pushes commits, so scheduled/manual run snapshots are not persisted for rollback."
    artifacts:
      - path: ".github/workflows/data-pipeline.yml"
        issue: "No git push step persists public/data/snapshots changes."
    missing:
      - "Push successful generated data and snapshot commits to main."
---

# Phase 04 Verification

**Status:** gaps_found  
**Score:** 11/16 must-haves verified  
**Verified:** 2026-05-07T00:00:00Z

## Overall Verdict

Phase 04 is **not achieved** yet. The automation and deployment wiring exists and automated checks pass, but the unattended automation loop is incomplete because generated commits are never pushed, and failure handling can falsely publish stale data as a successful refresh.

## Blocking Gaps

### 1. Successful pipeline commits do not trigger deployment

**Evidence:** `.github/workflows/data-pipeline.yml` commits generated data but has no `git push`.

**Impact:** Breaks the roadmap success criterion that successful pipeline commits trigger automatic deployment to GitHub Pages, and blocks INF-02 in the unattended refresh path.

**Missing:**

- Add `git push` after successful generated-data commits.
- Add workflow contract coverage requiring push behavior.

### 2. Pipeline can publish stale data after scraper failures

**Evidence:** `scripts/run-pipeline.ts` catches scraper failures, logs them, and can continue to compile, update `meta.lastRun`, validate, snapshot, and commit existing stale data as fresh.

**Impact:** Breaks the requirement that pipeline errors do not corrupt served data. The site may keep serving stale data, but metadata and snapshots can falsely claim a fresh successful run.

**Missing:**

- Track scraper failure count and fresh record count.
- Refuse to compile/update `lastRun` when all scrapers fail or no fresh records are produced.
- Add tests for all-failed and partially-failed scraper behavior.

### 3. Dated snapshots are not persisted remotely

**Evidence:** `scripts/snapshot-data.ts` creates snapshots and the workflow includes `public/data` in the local commit, but the workflow never pushes the commit.

**Impact:** Breaks INF-06 in scheduled/manual Actions runs because runner-local snapshots disappear when the job exits.

**Missing:**

- Push successful generated-data and snapshot commits to `main`.
- Test that workflow commits are followed by a push.

## Verified Must-Haves

| # | Must-have | Status |
|---|---|---|
| 1 | GitHub Actions workflow triggers at UTC 0/6/12/18 and runs the full data pipeline | VERIFIED |
| 2 | Successful pipeline commits trigger automatic deployment to GitHub Pages | FAILED |
| 3 | When the pipeline fails, the site continues serving the last valid dataset without interruption | FAILED |
| 4 | Each run commits a dated snapshot for versioning and rollback | FAILED |
| 5 | Pipeline completes within 15 minutes per run | VERIFIED |
| 6 | Failed validation does not promote generated data over served `public/data` | VERIFIED |
| 7 | Local verification can prove aggregate data validity before promotion | VERIFIED |
| 8 | Source/config pushes can run data pipeline but generated `public/data` pushes do not recursively run it | VERIFIED |
| 9 | Generated data commits avoid global CI suppression | VERIFIED |
| 10 | Only validated generated data artifacts are committed | VERIFIED |
| 11 | Deploy workflow deploys static Vite site to Pages on push to main | VERIFIED |
| 12 | Deployment uses Vite base `/iait/` and HashRouter-compatible output | VERIFIED |
| 13 | Deployment validates current `public/data` before build | VERIFIED |
| 14 | Deploy workflow uses least-privilege Pages permissions and no secrets | VERIFIED |
| 15 | Privileged workflow actions are pinned to immutable SHAs | VERIFIED |
| 16 | Workflow contract tests cover phase automation/deploy invariants | VERIFIED |

## Requirements Coverage

| Requirement | Status | Evidence |
|---|---|---|
| INF-01 | VERIFIED | Data workflow schedule is UTC 0/6/12/18 and runs the pipeline. |
| INF-02 | PARTIAL / BLOCKED | Deploy workflow exists, but data workflow does not push generated commits, so unattended refreshes do not trigger deployment. |
| INF-04 | VERIFIED | Data workflow has `timeout-minutes: 15`. |
| INF-05 | FAILED | Scraper failures are swallowed and can refresh metadata/snapshots as if the run succeeded. |
| INF-06 | FAILED | Snapshots are created locally but not persisted remotely because generated commits are not pushed. |

## Verification Evidence

- `npm test`: 26 test files passed, 158 tests passed.
- `npm run typecheck`: passed.
- `npm run build`: passed, with existing Vite large chunk warning.
- `npm run bundle:check`: passed, initial bundle gzip 95422 bytes.
- Schema drift gate: no drift detected.
- Codebase drift gate: skipped (`no-structure-md`).

## Additional Review Warnings

These are not the direct blockers above, but should be addressed before trusting unattended automation:

- `scripts/run-pipeline.ts` builds entity paths from raw external entity IDs, allowing path traversal writes outside the intended entity directory.
- `scripts/validate-data.ts` validates `history.json` shallowly and accepts malformed history series content.
- `scripts/snapshot-data.ts` accepts invalid retention values that can prune snapshots unexpectedly.
