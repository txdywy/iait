---
phase: 04-automation-deployment
reviewed: 2026-05-08T00:00:00Z
depth: standard
files_reviewed: 11
files_reviewed_list:
  - .github/workflows/data-pipeline.yml
  - .github/workflows/deploy.yml
  - package.json
  - scripts/__tests__/run-pipeline.test.ts
  - scripts/__tests__/snapshot-data.test.ts
  - scripts/__tests__/validate-data.test.ts
  - scripts/__tests__/workflow-data-pipeline.test.ts
  - scripts/__tests__/workflow-deploy.test.ts
  - scripts/run-pipeline.ts
  - scripts/snapshot-data.ts
  - scripts/validate-data.ts
findings:
  critical: 3
  warning: 2
  info: 0
  total: 5
status: issues_found
---

# Phase 04: Code Review Report

**Reviewed:** 2026-05-08T00:00:00Z
**Depth:** standard
**Files Reviewed:** 11
**Status:** issues_found

## Summary

Reviewed the automation/deployment workflows, data pipeline scripts, validation/snapshot scripts, package scripts, and their associated tests. The implementation has multiple correctness gaps in the data lifecycle: unchanged data causes scheduled pipeline failures, snapshots omit entity detail data, validation can pass deploys with missing drill-down entity files, and the deploy workflow accepts but ignores the requested commit SHA.

## Critical Issues

### CR-01: Scheduled pipeline fails whenever source data is unchanged

**File:** `/Users/yiwei/ics/iait/scripts/run-pipeline.ts:140-142`

**Issue:** `runPipeline` throws when `written === 0`, even if scrapers succeeded and returned records but all entity hashes matched existing metadata. In normal scheduled operation, unchanged upstream data is a valid outcome and should produce a no-op workflow, not a failed run. This breaks the automation contract: the data pipeline can fail every six hours during stable periods, preventing validation/snapshot/build steps from completing and making operational failures indistinguishable from no-change runs.

**Fix:**
Treat “scrapers succeeded and records were observed, but nothing changed” as a successful no-op. Compile can be skipped or run against the staged data, but the function should not throw solely because hashes match.

```ts
if (written === 0) {
  console.log(`[pipeline] No entity changes detected. Written: ${written}, Skipped: ${skipped}`);
  return;
}
```

If snapshots/builds must still run on no-change data, return only after compile/metadata handling is intentionally decided; do not throw.

### CR-02: Snapshots omit `public/data/entities/**` detail files

**File:** `/Users/yiwei/ics/iait/scripts/snapshot-data.ts:18-25` and `/Users/yiwei/ics/iait/scripts/snapshot-data.ts:96-99`

**Issue:** `createSnapshot` copies only six aggregate files into each snapshot. It does not copy the `entities/` directory, which contains per-entity detail JSON produced by the pipeline and validated by `validateEntityFiles`. A snapshot therefore cannot restore or audit the complete validated dataset. This is a data-loss/auditability risk because snapshots appear to represent “validated data” but silently exclude detail records needed by the frontend drill-down views.

**Fix:**
Copy the full data payload, or explicitly include `entities/` in snapshot creation. For example:

```ts
for (const fileName of SNAPSHOT_FILES) {
  await fs.copyFile(path.join(dataDir, fileName), path.join(snapshotDir, fileName));
}

const entitiesDir = path.join(dataDir, 'entities');
if (await pathExists(entitiesDir)) {
  await fs.cp(entitiesDir, path.join(snapshotDir, 'entities'), {
    recursive: true,
    errorOnExist: false,
  });
}
```

Also update the manifest to record directory contents or include an `entities/` entry.

### CR-03: Data validation can pass with missing entity detail files

**File:** `/Users/yiwei/ics/iait/scripts/validate-data.ts:212-220` and `/Users/yiwei/ics/iait/scripts/validate-data.ts:287-293`

**Issue:** `validateEntityFiles` silently returns success when `entities/` is missing. The aggregate files can contain valid `latest.json` entities while all corresponding `entities/<type>/<id>.json` detail files are absent, and validation still passes. Because the project serves static JSON with no backend fallback, this can ship a deployment where overview data works but drill-down/detail requests 404.

**Fix:**
Require entity detail files for entities referenced by `latest.json`, or at minimum fail when `entities/` is missing while `latest.json.entities` is non-empty. One approach:

```ts
async function validateEntityFiles(
  dataDir: string,
  errors: string[],
  expectedEntities: Record<string, unknown>,
): Promise<void> {
  const entitiesRoot = path.join(dataDir, 'entities');

  try {
    await fs.access(entitiesRoot);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      if (Object.keys(expectedEntities).length > 0) {
        errors.push('entities directory is required when latest.json contains entities');
      }
      return;
    }
    throw err;
  }

  // Existing directory traversal validation...
}
```

Then pass `latest.entities` from `validateDataDir`.

## Warnings

### WR-01: Deploy workflow ignores `source_sha`, allowing the wrong commit to be deployed

**File:** `/Users/yiwei/ics/iait/.github/workflows/deploy.yml:16-19` and `/Users/yiwei/ics/iait/.github/workflows/deploy.yml:34-35`

**Issue:** `deploy.yml` defines a `source_sha` workflow_dispatch input and the data pipeline sends `-f source_sha="$(git rev-parse HEAD)"`, but the deploy workflow never uses that input during checkout. On workflow dispatch, `actions/checkout` checks out the event ref rather than explicitly checking out the requested generated-data commit. If `main` advances between pipeline push/dispatch and deploy checkout, the deploy can build a different commit than the data pipeline requested.

**Fix:**
Use the input SHA when provided:

```yaml
- name: Checkout repository
  uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5
  with:
    ref: ${{ inputs.source_sha || github.sha }}
```

Optionally add a guard that verifies the checked-out SHA matches `inputs.source_sha` for data-pipeline dispatches.

### WR-02: `writeEntityIfChanged` can write invalid entity files for empty record arrays

**File:** `/Users/yiwei/ics/iait/scripts/run-pipeline.ts:49-55` and `/Users/yiwei/ics/iait/scripts/run-pipeline.ts:77-85`

**Issue:** `writeEntityIfChanged` is exported and accepts `records: NormalizedRecord[]`, but it does not validate that the array is non-empty. If called directly with `[]`, `sortedByTime[sortedByTime.length - 1]` becomes `undefined`, producing an invalid `EntityFile.latest` and potentially writing malformed JSON before validation catches it. The current `runPipeline` caller skips empty arrays, but the exported function’s contract is unsafe.

**Fix:**
Fail fast in `writeEntityIfChanged`:

```ts
if (records.length === 0) {
  throw new Error(`Cannot write entity ${entityId}: records must be non-empty`);
}
```

Add a unit test for direct empty-array calls.

---

_Reviewed: 2026-05-08T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
