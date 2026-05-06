---
phase: 1
slug: pipeline-skeleton
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-06
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.5 |
| **Config file** | `vitest.config.ts` (Wave 0 installs) |
| **Quick run command** | `pnpm vitest run scripts/` |
| **Full suite command** | `pnpm vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm vitest run scripts/`
- **After every plan wave:** Run `pnpm vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | PIPE-06, PIPE-07, PIPE-08, PIPE-09, PIPE-10, INF-03 | .env in .gitignore | unit | `pnpm vitest run scripts/__tests__/types.test.ts` | W0 | pending |
| 01-01-02 | 01 | 1 | PIPE-07 | N/A | unit | `pnpm vitest run scripts/__tests__/types.test.ts` | W0 | pending |
| 01-01-03 | 01 | 1 | PIPE-06, PIPE-07, PIPE-08, PIPE-09, PIPE-10, INF-03 | N/A | unit | `pnpm vitest run scripts/__tests__/types.test.ts` | W0 | pending |
| 01-02-01 | 02 | 1 | PIPE-08, PIPE-10, INF-03 | N/A | unit | `pnpm vitest run scripts/__tests__/hash.test.ts scripts/__tests__/fetch-with-retry.test.ts` | W0 | pending |
| 01-02-02 | 02 | 1 | PIPE-06 | N/A | unit | `pnpm vitest run scripts/__tests__/registry.test.ts` | W0 | pending |
| 01-03-01 | 03 | 2 | PIPE-01 | Validate AWS API response before parsing | unit | `pnpm vitest run scripts/__tests__/aws-gpu-pricing.test.ts` | W0 | pending |
| 01-03-02 | 03 | 2 | PIPE-01 | No credential logging | integration | `pnpm vitest run scripts/__tests__/aws-gpu-pricing.test.ts` | W0 | pending |
| 01-04-01 | 04 | 3 | PIPE-09 | N/A | unit | `pnpm vitest run scripts/__tests__/compiler.test.ts` | W0 | pending |
| 01-04-02 | 04 | 3 | PIPE-09 | N/A | unit | `pnpm vitest run scripts/__tests__/compiler.test.ts` | W0 | pending |
| 01-04-03 | 04 | 3 | PIPE-08, PIPE-09, PIPE-10 | N/A | unit | `pnpm vitest run scripts/__tests__/orchestrator.test.ts` | W0 | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] `vitest.config.ts` — Vitest configuration
- [ ] `tsconfig.json` — Base TypeScript configuration
- [ ] `tsconfig.scripts.json` — Pipeline-specific TS config (Node.js target, ESM)
- [ ] `scripts/__tests__/aws-gpu-pricing.test.ts` — Scraper integration test with mocked API
- [ ] `scripts/__tests__/registry.test.ts` — Registry auto-discovery test
- [ ] `scripts/__tests__/compiler.test.ts` — Compiler output schema test
- [ ] `scripts/__tests__/fetch-with-retry.test.ts` — Retry and backoff logic test
- [ ] `scripts/__tests__/hash.test.ts` — Content hash determinism test
- [ ] `scripts/__tests__/orchestrator.test.ts` — Orchestrator pipeline flow test
- [ ] `scripts/__tests__/fixtures/` — Mock AWS API response fixtures

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| AWS API live fetch returns real GPU pricing data | PIPE-01 | Requires live AWS credentials; cannot run in CI without secrets | Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY env vars, run `pnpm run pipeline`, verify `public/data/entities/cloud-region/aws-*.json` files created with real pricing data |
| Pipeline metadata written correctly after full run | INF-03 | Requires integration with real data to verify metadata completeness | After pipeline run, verify `public/data/_pipeline-meta.json` contains lastRun, per-entity hashes, and run status |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
