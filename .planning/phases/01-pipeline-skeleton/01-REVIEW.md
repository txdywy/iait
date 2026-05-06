---
phase: 01-pipeline-skeleton
reviewed: 2026-05-06T20:30:00Z
depth: standard
files_reviewed: 13
files_reviewed_list:
  - scripts/types.ts
  - scripts/hash.ts
  - scripts/fetch-with-retry.ts
  - scripts/registry.ts
  - scripts/compiler.ts
  - scripts/run-pipeline.ts
  - scripts/scrapers/aws-gpu-pricing.ts
  - scripts/scrapers/aws-signature-v4.ts
  - package.json
  - tsconfig.json
  - tsconfig.scripts.json
  - vitest.config.ts
  - .gitignore
findings:
  critical: 2
  warning: 3
  info: 3
  total: 8
status: issues_found
---

# Phase 1: Code Review Report

**Reviewed:** 2026-05-06T20:30:00Z
**Depth:** standard
**Files Reviewed:** 13 (8 source, 5 config/test fixture excluded)
**Status:** issues_found

## Summary

This review covers the pipeline skeleton: type definitions, hash utility, fetch-with-retry wrapper, scraper registry, compiler, pipeline orchestrator, AWS GPU Pricing scraper, and AWS Signature V4 implementation. Test files were excluded from defect reporting per policy (reviewed only for reliability concerns).

The code is generally well-structured with good separation of concerns, proper retry logic, and a sound hash-based incremental update mechanism. However, two correctness bugs in the orchestrator can produce stale or misleading data in production: the pipeline writes empty/stale output files when scrapers fail, and the "latest" record selection picks an arbitrary element from an unordered array rather than the most recent by timestamp.

## Critical Issues

### CR-01: Pipeline writes stale aggregate outputs when all scrapers return empty data

**File:** `scripts/run-pipeline.ts:89-94`
**Issue:** When all scrapers return zero records (e.g., network failure, empty API response, or first-time run with no configured scrapers), `compile(DATA_DIR)` is called unconditionally. This overwrites existing `latest.json`, `rankings.json`, and `history.json` with empty data, wiping out previously valid pipeline outputs. The metadata file is also updated with a fresh `lastRun` timestamp, making it appear the pipeline succeeded.

Similarly, if a single scraper produces records for some entities but not others, previously-written entity files persist in the filesystem and get compiled -- but the metadata `lastRun` still updates, creating a misleading signal that all data is current.

**Fix:**
```typescript
// After line 87, before compile():
const totalRecords = Array.from(byEntity.values()).reduce((sum, arr) => sum + arr.length, 0);  // accumulate per scraper
// ... after the scrapers loop:
if (written === 0 && Object.keys(meta.entities).length === 0) {
  console.warn('[pipeline] No data produced and no existing entities. Skipping compile.');
  return;
}
// Only compile if something changed or there are existing entities
await compile(DATA_DIR);
```

### CR-02: "Latest" record selection picks arbitrary item instead of most recent by timestamp

**File:** `scripts/run-pipeline.ts:52`
**Issue:** `records[records.length - 1]` is used to select the "latest" record for the entity file. However, the records array is in insertion order from the scraper -- not sorted by timestamp. The AWS Pricing API does not guarantee chronological ordering of results across paginated pages. This means `latest` in the entity file could point to any arbitrary record rather than the one with the most recent timestamp. Downstream, `compiler.ts` uses `entity.latest` to populate the snapshot in `latest.json` (line 75: `score: entity.latest.value`), so this bug directly affects the accuracy of the compiled output.

**Fix:**
```typescript
// In writeEntityIfChanged, before line 49:
const sortedByTime = [...records].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
const entityFile: EntityFile = {
  id: entityId,
  type: entityType,
  latest: sortedByTime[sortedByTime.length - 1],
  series: sortedByTime,
  _hash: newHash,
  _updatedAt: new Date().toISOString(),
};
```

## Warnings

### WR-01: Pipeline metadata accumulates stale entity entries indefinitely

**File:** `scripts/run-pipeline.ts:59`
**Issue:** When an entity is written, it is added to `meta.entities`. However, when an entity is no longer produced by any scraper (e.g., an AWS region is decommissioned), its entry remains in `_pipeline-meta.json` forever. Over time this causes the metadata file to grow without bound with dead entries. More importantly, if that entity ID is later reused for a different entity, the stale hash could cause a legitimate update to be skipped (hash collision scenario).

**Fix:**
```typescript
// After the scrapers loop (after line 87), before compile:
// Remove meta entries for entities that weren't seen in this run
const seenEntityIds = new Set<string>();
for (const scraper of scrapers) { /* accumulate */ }
// Or: after the loop, prune meta.entities of keys not in seenEntityIds
```

### WR-02: AWS Signature V4 swallows original error context on signing failure

**File:** `scripts/scrapers/aws-signature-v4.ts:91-93`
**Issue:** The `signRequest` function wraps the entire signing logic in a try/catch that throws a generic `new Error('Failed to sign AWS request')` without preserving the original error. If the `URL` constructor throws (e.g., malformed URL) or if crypto operations fail, the actual cause is lost. This makes debugging production failures significantly harder.

**Fix:**
```typescript
} catch (cause) {
  throw new Error('Failed to sign AWS request', { cause });
}
```

### WR-03: Accessing `entityRecords[0]` without guarding against empty array

**File:** `scripts/run-pipeline.ts:82`
**Issue:** `entityRecords[0].entity.type` is accessed without checking that the array is non-empty. While `groupByEntity` only creates entries when records are pushed (so the array should never be empty in practice), the function's contract does not enforce this. If `groupByEntity` is ever refactored or called with pre-constructed data, this would throw an uncaught `TypeError: Cannot read properties of undefined`.

**Fix:**
```typescript
for (const [entityId, entityRecords] of byEntity) {
  if (entityRecords.length === 0) continue;  // defensive guard
  const entityType = entityRecords[0].entity.type;
  // ...
}
```

## Info

### IN-01: Test file uses `as any` to bypass type system

**File:** `scripts/__tests__/hash.test.ts:8`
**Issue:** `makeRecord` uses `type: 'cloud-region' as any` to bypass the `EntityType` enum. This suppresses type checking and could mask type mismatches if the `EntityType` values change. Should use `EntityType.CLOUD_REGION` from the imported types instead.

**Fix:**
```typescript
import { EntityType } from '../types.js';
// ...
type: EntityType.CLOUD_REGION,
```

### IN-02: No package lockfile committed

**File:** `package.json`
**Issue:** The repository has no `package-lock.json` (or equivalent). Without a lockfile, CI and local environments may resolve different dependency versions, causing non-reproducible builds. The `.gitignore` does not exclude lockfiles, so this is simply a missing file rather than an intentional exclusion.

**Fix:** Run `npm install` and commit the resulting `package-lock.json`.

### IN-03: Dynamic import mocking in registry test may not apply to already-imported module

**File:** `scripts/__tests__/registry.test.ts:24`
**Issue:** `vi.doMock` is called after `discoverScrapers` is already imported at the top of the file (line 8). In Vitest, `vi.doMock` affects subsequent dynamic `import()` calls but does not retroactively affect modules already loaded. The test passes because it only asserts that `glob` was called (line 30), but the actual dynamic import of the mock scraper file would not resolve to the mocked module. This means the test does not fully verify scraper registration.

**Fix:** Move the dynamic import assertion into a separate test that uses `await import()` after `vi.doMock`, or restructure to use `vi.mock` with a factory that can be changed per test.

---

_Reviewed: 2026-05-06T20:30:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
