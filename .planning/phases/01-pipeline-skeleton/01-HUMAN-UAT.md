---
status: partial
phase: 01-pipeline-skeleton
source: [01-VERIFICATION.md]
started: 2026-05-06T20:35:00Z
updated: 2026-05-06T20:35:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Live Pipeline Run
Set AWS credentials (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY with pricing:GetProducts IAM permission), run `npm run pipeline`
expected: Pipeline fetches GPU pricing for 6 families, writes entity JSON files under `public/data/entities/cloud-region/`, produces latest.json, rankings.json, history.json, and _pipeline-meta.json
result: [pending]

### 2. Pipeline Idempotency
Run `npm run pipeline` twice in succession
expected: Second run shows `[skip]` for all entities (hash match), `Written: 0, Skipped: N`
result: [pending]

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps
