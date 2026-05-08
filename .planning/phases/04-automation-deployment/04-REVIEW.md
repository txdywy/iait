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
  critical: 0
  warning: 0
  info: 0
  total: 0
resolved_findings:
  critical: 1
  warning: 2
  info: 0
  total: 3
status: resolved
---

# Phase 04: Code Review Report

**Reviewed:** 2026-05-08T00:00:00Z
**Depth:** standard
**Files Reviewed:** 29
**Status:** resolved

## Summary

Reviewed the listed GitHub Actions workflows, package scripts, static entity JSON files, automation scripts, and script tests at standard depth. The originally reported findings are now resolved: CR-01 is stale because `deploy.yml` already verifies requested `source_sha` ancestry against `origin/main`, and WR-01/WR-02 were fixed with regression coverage.

## Resolved Critical Issues

### CR-01: Manual pipeline runs can deploy non-main commits to production Pages

**Resolution:** Resolved as stale. Current `.github/workflows/deploy.yml` includes `Verify requested source SHA is on main`, fetches `origin/main`, and rejects any `source_sha` that is not reachable from `origin/main` before deployment. No workflow code change was required.


**Classification:** BLOCKER

**File:** `/Users/yiwei/ics/iait/.github/workflows/data-pipeline.yml:6`, `/Users/yiwei/ics/iait/.github/workflows/data-pipeline.yml:92-105`, and `/Users/yiwei/ics/iait/.github/workflows/deploy.yml:34-38`

**Issue:** `data-pipeline.yml` allows unrestricted `workflow_dispatch`, commits/pushes generated data to the currently selected ref, and then dispatches `deploy.yml --ref main` with `source_sha="$(git rev-parse HEAD)"`. `deploy.yml` checks out `${{ inputs.source_sha || github.sha }}` without verifying that this SHA belongs to `main`. A manual run from a feature branch can therefore push a generated commit on that branch and deploy that branch's source tree to GitHub Pages, bypassing the intended `main`-only production deployment path and any branch-protection/review gate on `main`.

**Fix:** Fail closed unless the pipeline is running on `refs/heads/main`, or only dispatch deployment when the generated SHA is confirmed to be reachable from `origin/main`. For example, add an early guard before commit/deploy steps:

```yaml
      - name: Ensure production pipeline runs on main
        run: |
          if [ "${GITHUB_REF}" != "refs/heads/main" ]; then
            echo "Data deployment is only allowed from main" >&2
            exit 1
          fi
```

Also harden `deploy.yml` before checkout/deploy by fetching `main` and rejecting any provided `source_sha` that is not an ancestor of `origin/main`:

```yaml
      - name: Verify requested source SHA is on main
        if: ${{ inputs.source_sha != '' }}
        run: |
          git fetch origin main
          git merge-base --is-ancestor "${{ inputs.source_sha }}" origin/main
```

## Resolved Warnings

### WR-01: Validation does not reject unsafe entity IDs before building filesystem paths

**Resolution:** Fixed in `scripts/validate-data.ts` and covered by `scripts/__tests__/validate-data.test.ts`; unsafe latest entity IDs are rejected as unsafe path segments and skipped for referenced detail-file path construction.


**Classification:** WARNING

**File:** `/Users/yiwei/ics/iait/scripts/validate-data.ts:79` and `/Users/yiwei/ics/iait/scripts/validate-data.ts:237-241`

**Issue:** `validateLatest` accepts arbitrary keys from `latest.json.entities`, and `validateEntityFiles` interpolates each key into `entities/${entity.type}/${entityId}.json` for existence checks. A malformed entity id containing path separators or traversal segments can make the validation gate check a path outside the intended entity-type directory, weakening the guarantee that every aggregate entity has a valid detail file.

**Fix:** Apply the same safe path-segment rule used by `run-pipeline.ts` to every aggregate entity id before constructing any path, record a validation error for unsafe IDs, and skip the filesystem check for those entries. For example:

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

### WR-02: Country detail files use country codes as display names

**Resolution:** Fixed in `public/data/entities/country/{be,br,tw}.json` and covered by `scripts/__tests__/validate-data.test.ts`; country detail data now uses Belgium, Brazil, and Taiwan in `latest.entity.name` and `series[].entity.name`.

**Classification:** WARNING

**File:** `/Users/yiwei/ics/iait/public/data/entities/country/be.json:9`, `/Users/yiwei/ics/iait/public/data/entities/country/br.json:9`, and `/Users/yiwei/ics/iait/public/data/entities/country/tw.json:9`

**Issue:** The country detail files set `entity.name` to `be`, `br`, and `tw` instead of the canonical human-readable names already present in `entity-crossref.json` (`Belgium`, `Brazil`, `Taiwan`). The compiler uses `scored.entity.latest.entity.name` when writing aggregate `latest.json`, so real country entity files with code-valued names can leak lower-case country codes into public UI/detail output instead of user-facing labels.

**Fix:** Replace the country entity display names with canonical names in both `latest.entity.name` and every `series[].entity.name`. For example, in `be.json`:

```json
"entity": {
  "id": "be",
  "type": "country",
  "name": "Belgium"
}
```

Apply equivalent changes for `br` (`Brazil`) and `tw` (`Taiwan`).

---

_Reviewed: 2026-05-08T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
