---
phase: 04-automation-deployment
reviewed: 2026-05-08T00:00:00Z
depth: standard
files_reviewed: 29
files_reviewed_list:
  - .github/workflows/data-pipeline.yml
  - .github/workflows/deploy.yml
  - package.json
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
  - scripts/__tests__/run-pipeline.test.ts
  - scripts/__tests__/snapshot-data.test.ts
  - scripts/__tests__/validate-data.test.ts
  - scripts/__tests__/workflow-data-pipeline.test.ts
  - scripts/__tests__/workflow-deploy.test.ts
  - scripts/run-pipeline.ts
  - scripts/snapshot-data.ts
  - scripts/validate-data.ts
findings:
  critical: 1
  warning: 2
  info: 0
  total: 3
status: issues_found
---

# Phase 04: Code Review Report

**Reviewed:** 2026-05-08T00:00:00Z
**Depth:** standard
**Files Reviewed:** 29
**Status:** issues_found

## Summary

Reviewed the listed automation/deployment workflows, package scripts, static entity JSON files, pipeline/snapshot/validation scripts, and associated tests at standard depth. The gap-closure changes fixed the previously visible snapshot/entity-validation gaps, but there is still one blocker for unattended scheduled automation and two data-integrity/validation robustness issues that should be fixed before shipping the phase.

## Critical Issues

### CR-01: Scheduled pipeline fails on valid no-change refreshes

**File:** `/Users/yiwei/ics/iait/scripts/run-pipeline.ts:140-142`

**Issue:** `runPipeline` throws when `written === 0`, even when scrapers succeeded and returned fresh records but every entity hash matched existing metadata. In scheduled unattended operation, unchanged upstream data is a normal successful outcome; this code turns stable data periods into failed workflow runs before snapshot/build/deploy gating can complete, making real outages indistinguishable from no-op refreshes.

**Fix:** Treat successful scraper runs with unchanged hashes as a successful no-op instead of throwing. For example:

```ts
if (written === 0) {
  console.log(`[pipeline] No entity changes detected. Written: ${written}, Skipped: ${skipped}`);
  await compile(dataDir);
  meta.lastRun = new Date().toISOString();
  await fs.writeFile(metaPath, JSON.stringify(meta, null, 2));
  return;
}
```

If the intended behavior is to avoid commits on no-change data, return successfully after any required validation metadata update; do not fail the workflow solely because hashes matched.

## Warnings

### WR-01: Validation does not reject unsafe entity IDs before building filesystem paths

**File:** `/Users/yiwei/ics/iait/scripts/validate-data.ts:79` and `/Users/yiwei/ics/iait/scripts/validate-data.ts:237-241`

**Issue:** `validateLatest` accepts arbitrary keys from `latest.json.entities`, and `validateEntityFiles` later interpolates each key into `entities/${entity.type}/${entityId}.json`. A malformed entity id such as `../../latest` can cause the existence check to resolve outside the expected entity-type directory and mask a missing detail file. This weakens the static data integrity gate that is supposed to prevent broken drill-down JSON from being deployed.

**Fix:** Reuse the same safe path-segment rule used by the pipeline for every aggregate entity id before any `path.join` call, and skip filesystem checks for unsafe ids after recording an error. For example:

```ts
function isSafePathSegment(value: string): boolean {
  return value.length > 0
    && value === value.trim()
    && value !== '.'
    && value !== '..'
    && /^[A-Za-z0-9_-]+$/.test(value);
}

for (const [entityId, entity] of Object.entries(value.entities)) {
  if (!isSafePathSegment(entityId)) {
    errors.push(`latest.json entity ${entityId} id must be a safe path segment`);
    continue;
  }
  // existing entity validation...
}
```

Also apply the same check to `entityId` derived from filenames if those IDs are ever used to construct further paths or frontend URLs.

### WR-02: Country detail files use country codes as display names

**File:** `/Users/yiwei/ics/iait/public/data/entities/country/be.json:9`, `/Users/yiwei/ics/iait/public/data/entities/country/br.json:9`, and `/Users/yiwei/ics/iait/public/data/entities/country/tw.json:9`

**Issue:** The new country detail files set `entity.name` to `be`, `br`, and `tw` instead of the human-readable names already present in the cross-reference data (`Belgium`, `Brazil`, `Taiwan`). These detail files are loaded by the compiler as real entities; when a real entity exists, the compiler uses `scored.entity.latest.entity.name` for aggregate output, so the public data can expose lower-case country codes in UI/detail views instead of proper labels.

**Fix:** Replace the country entity display names with canonical human-readable names and keep them consistent in both `latest.entity.name` and every `series[].entity.name` entry. For example, in `be.json`:

```json
"entity": {
  "id": "be",
  "type": "country",
  "name": "Belgium"
}
```

Apply equivalent fixes for Brazil and Taiwan.

---

_Reviewed: 2026-05-08T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
