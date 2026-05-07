---
phase: 04-automation-deployment
reviewed: 2026-05-07T00:00:00Z
depth: standard
files_reviewed: 11
findings:
  critical: 3
  warning: 3
  info: 0
  total: 6
status: issues_found
---

# Phase 04: Code Review Report

**Reviewed:** 2026-05-07T00:00:00Z  
**Depth:** standard  
**Files Reviewed:** 11  
**Status:** issues_found

## Files Reviewed

- `.github/workflows/data-pipeline.yml`
- `.github/workflows/deploy.yml`
- `package.json`
- `scripts/__tests__/run-pipeline.test.ts`
- `scripts/__tests__/snapshot-data.test.ts`
- `scripts/__tests__/validate-data.test.ts`
- `scripts/__tests__/workflow-data-pipeline.test.ts`
- `scripts/__tests__/workflow-deploy.test.ts`
- `scripts/run-pipeline.ts`
- `scripts/snapshot-data.ts`
- `scripts/validate-data.ts`

## Summary

Reviewed the automation/deployment workflows plus pipeline, snapshot, validation scripts and their tests. The implementation has several ship-blocking correctness/security issues: the data pipeline creates commits but never pushes them, entity IDs can escape the intended data directory, and scraper failures can be silently converted into a successful stale-data run. Validation coverage also leaves malformed public data undetected.

## Critical Issues

### CR-01: Data pipeline commits generated data but never pushes it

**File:** `.github/workflows/data-pipeline.yml:83-90`

**Issue:** The workflow commits generated data locally inside the Actions runner, but there is no `git push`. Scheduled/manual pipeline runs will finish successfully while generated snapshots are discarded when the runner exits. This breaks the core automation requirement that GitHub Actions generate and commit static JSON data.

**Recommended fix:** Add `git push` after a successful generated-data commit, and update `scripts/__tests__/workflow-data-pipeline.test.ts` to assert that successful commits are pushed.

### CR-02: Unsanitized entity IDs allow path traversal writes outside `public/data/entities`

**File:** `scripts/run-pipeline.ts:50`

**Issue:** `writeEntityIfChanged` builds the output path with raw `entityId`. Scraper output is external data; a malformed or compromised scraper record with an ID such as `../../../../.github/workflows/pwned` can write outside the intended entity directory.

**Recommended fix:** Validate `entityId` and `entityType` as safe path segments before constructing output paths, and add tests covering `../`, `/`, backslashes, empty IDs, and unexpected entity types.

### CR-03: Pipeline can silently publish stale data after scraper failures

**File:** `scripts/run-pipeline.ts:78-91,105-113`

**Issue:** Individual scraper failures are caught and only logged. If all scrapers fail but `_pipeline-meta.json` already contains entities, the pipeline continues to compile, updates `meta.lastRun`, and exits successfully. The workflow can then validate/snapshot/commit stale data while claiming a fresh successful run.

**Recommended fix:** Track failed scrapers and fresh record counts. Refuse to compile/update `lastRun` when all scrapers fail or no fresh records are produced.

## Warnings

### WR-01: Inconsistent entity types for the same ID are merged without validation

**File:** `scripts/run-pipeline.ts:84-100`

**Issue:** Records are grouped only by `record.entity.id`. If two sources emit the same ID with different `entity.type` values, all records are merged and written using `records[0].entity.type`, potentially under the wrong entity type directory.

**Recommended fix:** Validate that all records for an entity ID share one entity type before writing.

### WR-02: Invalid snapshot retention values can delete every snapshot

**File:** `scripts/snapshot-data.ts:100-102,88-93`

**Issue:** CLI `keepArg` is parsed with `Number.parseInt` and passed through without validation. `NaN`, `0`, or negative values can make retention empty or unexpected and prune snapshots, including the newly-created one.

**Recommended fix:** Normalize `keep` to a positive integer and reject invalid values. Add tests for `keep=0`, negative, and non-numeric values.

### WR-03: Data validator accepts malformed public data timestamps and history content

**File:** `scripts/validate-data.ts:77,111-115`

**Issue:** `latest.json` entity `lastUpdated` only needs to be non-empty, not a parseable ISO timestamp. `history.json` is only checked to be an object; malformed entries, invalid series arrays, bad timestamps, non-numeric scores, and invalid factors all pass validation.

**Recommended fix:** Validate `lastUpdated` as ISO and validate each `history.json` entry, series point, timestamp, score, and factors object.

---

_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
