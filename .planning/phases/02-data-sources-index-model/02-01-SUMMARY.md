---
phase: 02-data-sources-index-model
plan: 01
status: complete
started: 2026-05-07
completed: 2026-05-07
tasks_total: 3
tasks_completed: 3
requirements_covered: [PIPE-05, INDX-03, INDX-04, INDX-06, INDX-07]
---

# Plan 02-01 Summary: Bug Fixes, Type Extensions, and Config Files

## What Was Done

### Task 1: Fix CR-01/CR-02 bugs in run-pipeline.ts and extend types.ts
**Commit:** `fix(pipeline): fix CR-01/CR-02/WR-03 bugs and extend types for Phase 2 index model`

- **CR-01 fixed:** Added empty-compile guard — when `written === 0` and no existing entities, `compile()` is skipped with a warning, preventing stale aggregate output overwrites
- **CR-02 fixed:** Records are now sorted by timestamp ascending before selecting `latest`, ensuring the most recent record is always used regardless of scraper insertion order
- **WR-03 fixed:** Added defensive `if (entityRecords.length === 0) continue;` guard in entity processing loop
- **Types extended:** `CompiledEntity` gained 4 optional Phase 2 fields: `riskTier`, `riskMultiplier`, `factorBreakdown`, `dataCompleteness`
- **New interfaces:** Added `IndexConfig`, `ExportControlTiers`, `EntityCrossRef` to `scripts/types.ts`

### Task 2: Create entity-crossref, export-control-tiers, and index-config JSON files
**Commit:** `feat(config): add entity crossref, export control tiers, and index config`

- **entity-crossref.json:** Maps 10 countries (ISO-2/3, World Bank, OWID names), 23 cloud regions (5 providers), 20 cities, 5 companies (with SEC CIK numbers)
- **export-control-tiers.json:** 3 tiers — unrestricted (1.0), restricted (0.7), sanctioned (0.3). China = sanctioned, India = restricted, 8 others = unrestricted
- **index-config.json:** 5 factors (gpu_supply 0.30, energy_capacity 0.20, cloud_region_density 0.15, ai_capex 0.25, risk_adjustment 0.10) summing to 1.0. Confidence scoring with stale/very-stale penalties

### Task 3: Create seed entity files for GCP, Oracle, and IBM cloud regions
**Commit:** `feat(data): add seed entity files for GCP, Oracle, and IBM cloud regions`

- Created 5 seed entity files under `public/data/entities/cloud-region/`:
  - `gcp-us-central1.json` ($3.50/hr)
  - `gcp-europe-west1.json` ($3.80/hr)
  - `gcp-asia-east1.json` ($3.60/hr)
  - `oracle-us-ashburn-1.json` ($4.00/hr)
  - `ibm-us-south.json` ($4.20/hr)
- All use `manual-seed` source with confidence 4 (DataSourceLayer.MANUAL per D-07)
- Entity IDs match entity-crossref.json keys exactly

## Files Changed

| File | Action | Purpose |
|------|--------|---------|
| `scripts/run-pipeline.ts` | modified | CR-01, CR-02, WR-03 bug fixes |
| `scripts/types.ts` | modified | Extended CompiledEntity, added 3 new interfaces |
| `scripts/mappings/entity-crossref.json` | created | Cross-source entity mapping for MVP scope |
| `scripts/mappings/export-control-tiers.json` | created | Export control tier definitions and country assignments |
| `public/data/index-config.json` | created | Index factor weights and confidence scoring parameters |
| `public/data/entities/cloud-region/gcp-us-central1.json` | created | GCP US seed entity |
| `public/data/entities/cloud-region/gcp-europe-west1.json` | created | GCP Europe seed entity |
| `public/data/entities/cloud-region/gcp-asia-east1.json` | created | GCP Asia seed entity |
| `public/data/entities/cloud-region/oracle-us-ashburn-1.json` | created | Oracle US seed entity |
| `public/data/entities/cloud-region/ibm-us-south.json` | created | IBM US seed entity |

## Verification

- `npx tsc --noEmit -p tsconfig.scripts.json` — exits 0
- `npx vitest run` — 7 test files, 27 tests, all passing
- Entity crossref: 10 countries, 23 cloud regions, 20 cities, 5 companies verified
- Export tiers: 3 tiers, 10 country assignments, correct multipliers verified
- Index config: 5 factors, weight sum = 1.0, 6 confidence params verified
- Seed entities: 5 files, all confidence 4, source manual-seed, correct IDs verified

## Decisions

- City entities are derived from cloud-region rollup via crossref — no separate city entity files needed at this stage
- GCP/Oracle/IBM GPU pricing values are rough mid-range estimates as placeholders for trend modeling; staleness penalty will apply per confidence config
- Seed entity `_hash` is empty string since these are manual entries, not pipeline-generated
