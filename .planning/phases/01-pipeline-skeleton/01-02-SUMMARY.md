---
phase: 01-pipeline-skeleton
plan: 02
subsystem: pipeline
tags: [typescript, sha256, http-retry, glob, scraper-registry, vitest]

requires:
  - phase: 01-pipeline-skeleton
    provides: "Type definitions (scripts/types.ts), test scaffolds (hash.test.ts, fetch-with-retry.test.ts, registry.test.ts), project config (tsconfig, vitest)"
provides:
  - "SHA-256 content hashing for NormalizedRecord arrays (scripts/hash.ts)"
  - "HTTP fetch wrapper with retry, exponential backoff, jitter, timeout (scripts/fetch-with-retry.ts)"
  - "Scraper auto-discovery and registration via glob (scripts/registry.ts)"
affects: [01-pipeline-skeleton, pipeline-orchestration, scrapers]

tech-stack:
  added: []
  patterns: ["deterministic hashing via timestamp sorting", "exponential backoff with jitter (0.75-1.25x)", "gotResponse flag for HTTP vs network error distinction", "fileURLToPath for ESM path resolution"]

key-files:
  created:
    - scripts/hash.ts
    - scripts/fetch-with-retry.ts
    - scripts/registry.ts
  modified: []

key-decisions:
  - "Used gotResponse flag to distinguish HTTP errors from network errors in catch block, preventing unnecessary retries on non-retryable HTTP status codes"
  - "Used fileURLToPath(import.meta.url) instead of import.meta.dirname for ESM-compatible path resolution in registry"

patterns-established:
  - "Content hashing: sort records by timestamp before SHA-256 for deterministic output"
  - "Retry logic: exponential backoff with jitter, AbortController timeout, gotResponse flag"
  - "Scraper registry: glob-based discovery, Map storage, getScrapers/getScraper API"

requirements-completed: [PIPE-06, PIPE-08, PIPE-10, INF-03]

duration: 9min
completed: 2026-05-06
---

# Phase 01 Plan 02: Shared Pipeline Utilities Summary

**SHA-256 content hashing, HTTP fetch with exponential backoff/retry, and glob-based scraper registry -- foundation modules for all scrapers and pipeline orchestration**

## Performance

- **Duration:** 9 min
- **Started:** 2026-05-06T11:59:01Z
- **Completed:** 2026-05-06T12:08:11Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- hashRecords produces deterministic, order-independent SHA-256 hashes for NormalizedRecord arrays
- fetchWithRetry retries on 429/5xx with exponential backoff and jitter, throws immediately on 4xx, aborts on timeout
- Registry discovers scrapers via glob, stores in Map, exposes getScrapers/getScraper lookup
- All 12 tests pass (3 hash + 6 fetch-with-retry + 3 registry)

## Task Commits

Each task was committed atomically:

1. **Task 1: Content hash and HTTP fetch utilities** - `7ad8f50` (feat)
2. **Task 2: Scraper registry with auto-discovery** - `5f14fd0` (feat)

## Files Created/Modified
- `scripts/hash.ts` - SHA-256 content hashing for NormalizedRecord arrays with timestamp-sorted deterministic output
- `scripts/fetch-with-retry.ts` - HTTP fetch wrapper with exponential backoff, jitter, AbortController timeout, and gotResponse flag for HTTP vs network error distinction
- `scripts/registry.ts` - Scraper auto-discovery via glob, module-level Map storage, getScrapers/getScraper API

## Decisions Made
- Used `gotResponse` flag pattern in catch block to distinguish HTTP errors (non-retryable) from network errors (retryable) -- prevents the catch block from retrying on non-retryable HTTP status codes
- Used `fileURLToPath(import.meta.url)` for ESM path resolution in registry instead of `import.meta.dirname` (more portable across ESM contexts)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed fetchWithRetry retrying on non-retryable HTTP errors**
- **Found during:** Task 1 (Content hash and HTTP fetch utilities)
- **Issue:** The catch block in fetchWithRetry caught thrown HTTP errors (e.g., 400) and retried them, because the thrown Error was indistinguishable from a network error. Test "throws on 400 non-retryable error" expected fetch to be called 1 time but got 4 times (1 + 3 retries).
- **Fix:** Added `gotResponse` boolean flag set to `true` after receiving a response. In the catch block, if `gotResponse` is true, the error is immediately re-thrown without retry. Only actual network errors (where no response was received) trigger retries.
- **Files modified:** scripts/fetch-with-retry.ts
- **Verification:** All 6 fetch-with-retry tests pass, including "throws on 400 non-retryable error" with correct call count (1)
- **Committed in:** 7ad8f50 (Task 1 commit)

**2. [Rule 3 - Blocking] Created prerequisite files from Plan 01 (types.ts, test scaffolds)**
- **Found during:** Task 1 start
- **Issue:** Plan 01 (which creates types.ts and test files) runs in parallel with this plan. The test files and types.ts were needed before implementation could begin. The Plan 01 executor subsequently committed these files, and my local versions matched exactly (no diff).
- **Fix:** Created types.ts, hash.test.ts, fetch-with-retry.test.ts, and registry.test.ts from the exact specifications in Plan 01 Task 3. These matched the committed versions (verified via `git diff`).
- **Files modified:** scripts/types.ts, scripts/__tests__/hash.test.ts, scripts/__tests__/fetch-with-retry.test.ts, scripts/__tests__/registry.test.ts
- **Verification:** `git diff -- scripts/types.ts scripts/__tests__/hash.test.ts scripts/__tests__/fetch-with-retry.test.ts scripts/__tests__/registry.test.ts` returns no differences
- **Committed in:** Already committed by Plan 01 executor (commits 16a83a9, fdfb4e6, 35c8a2b)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Both auto-fixes were necessary for correctness. The gotResponse flag fix prevents production code from wastefully retrying on client errors (4xx). No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- hash.ts, fetch-with-retry.ts, and registry.ts are available for import by Plans 03 (compiler, pipeline orchestration) and 04 (AWS GPU pricing scraper)
- All imports use .js extensions per NodeNext module resolution

## TDD Gate Compliance

- **RED gate:** Tests existed before implementation (created by Plan 01). Confirmed tests fail with `ERR_MODULE_NOT_FOUND` before production code was written.
- **GREEN gate:** All 12 target tests pass after implementation.
- **REFACTOR gate:** Not needed -- implementation was clean from the start (after the gotResponse fix).

## Self-Check: PASSED

- All 3 production files exist (scripts/hash.ts, scripts/fetch-with-retry.ts, scripts/registry.ts)
- Both task commits found in git log (7ad8f50, 5f14fd0)
- SUMMARY.md exists at .planning/phases/01-pipeline-skeleton/01-02-SUMMARY.md

---
*Phase: 01-pipeline-skeleton*
*Completed: 2026-05-06*
