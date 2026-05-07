---
phase: 03
slug: frontend-visualization
status: revised
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-07
---

# Phase 03 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm test -- --run src/` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run the most specific frontend Vitest file for the touched feature.
- **After every plan wave:** Run `npm test` and `npm run build` once the Vite frontend scripts exist.
- **Before `/gsd-verify-work`:** Full suite must be green, pipeline must still pass, and bundle-size gate must be checked.
- **Max feedback latency:** 60 seconds for targeted tests; 180 seconds for full wave verification.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-T1 | 03-01 | 1 | FE-08, FE-09 | T-03-01 / T-03-02 / T-03-03 | Minimal boot shell builds; Vite base path is `/iait/`; no frontend secrets are introduced | type/build | `npm run typecheck && npm run build` | Plan creates | ⬜ pending |
| 03-01-T2 | 03-01 | 1 | FE-02, FE-09 | T-03-02 / T-03-03 | Static JSON fetches use `import.meta.env.BASE_URL`, query keys cover aggregate/crossref/geo assets, and errors are visible | unit | `npm test -- src/data/static-json.test.ts -x` | Plan creates | ⬜ pending |
| 03-01-T3 | 03-01 | 1 | FE-01, FE-08, FE-09 | T-03-04 | Pipeline aggregate JSON, public crossref, and country boundaries exist before UI tests; bundle gate enforces 300KB gzip | pipeline/build | `npm run pipeline && npm run prepare:geo && test -s public/data/latest.json && test -s public/data/rankings.json && test -s public/data/history.json && test -s public/data/entity-crossref.json && npm run build && npm run bundle:check` | Plan creates | ⬜ pending |
| 03-02-T1 | 03-02 | 2 | FE-07, FE-09 | T-03-06 / T-03-07 | HUD shell preserves readable dark tokens and does not import RankingRail before it exists | build | `npm run build` | Plan updates | ⬜ pending |
| 03-02-T2 | 03-02 | 2 | FE-05, FE-07 | T-03-06 / T-03-08 | Badges render confidence/completeness/freshness/risk as text, not color-only or legal claims | component | `npm test -- src/components/hud-panel.test.tsx -x` | Plan creates | ⬜ pending |
| 03-02-T3 | 03-02 | 2 | FE-03, FE-07 | T-03-06 / T-03-07 | Ranking rows sort by score, keep low-confidence rows visible, and render text badges safely | component | `npm test -- src/features/rankings/rankings.test.tsx -x` | Plan creates | ⬜ pending |
| 03-03-T1 | 03-03 | 3 | FE-01, FE-02 | T-03-10 / T-03-12 | Country joins use explicit IDs; drill-down derives cluster proxy nodes and labels company overlays symbolically | unit/component | `npm test -- src/features/map/country-join.test.ts src/features/map/drilldown.test.tsx -x` | Plan creates | ⬜ pending |
| 03-03-T2 | 03-03 | 3 | FE-01, FE-02, FE-09 | T-03-11 / T-03-13 | MapLibre shell renders country layer, zoom-first selection, symbolic overlays, and static data error states | component/build | `npm test -- src/features/map/drilldown.test.tsx -x && npm run build` | Plan creates/updates | ⬜ pending |
| 03-04-T1 | 03-04 | 4 | FE-06, FE-08 | T-03-15 / T-03-19 | Hash routes are static-host compatible and detail routes preserve the persistent map-first shell | component | `npm test -- src/app/router.test.tsx -x` | Plan creates/updates | ⬜ pending |
| 03-04-T2 | 03-04 | 4 | FE-05 | T-03-16 / T-03-17 | Detail rail renders actual source identifiers from per-entity normalized records plus factor/risk/freshness copy | component | `npm test -- src/features/details/entity-detail.test.tsx -x` | Plan creates/updates | ⬜ pending |
| 03-04-T3 | 03-04 | 4 | FE-04, FE-08 | T-03-18 / T-03-19 | ECharts trend chart is lazy-loaded, empty history is handled, and bundle gate passes | unit/build | `npm test -- src/features/trends/trend-options.test.ts -x && npm run build && npm run bundle:check` | Plan creates/updates | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Wave 0 is represented by Plan 03-01 foundation tasks. It is complete at the planning-contract level because every previously missing prerequisite has an automated Plan 03-01 task and command before dependent UI plans run; execution remains pending.

- [x] Install frontend runtime dependencies: React, Vite, MapLibre, ECharts, React Query, Zustand, React Router, Tailwind CSS 4, TopoJSON utilities. Covered by `03-01-T1`.
- [x] Install React test dependencies: `jsdom`, `@testing-library/react`, and `@testing-library/jest-dom`. Covered by `03-01-T1`.
- [x] Add test setup for jsdom component tests. Covered by `03-01-T1`.
- [x] Materialize `public/data/latest.json`, `public/data/rankings.json`, and `public/data/history.json` before UI tests rely on them. Covered by `03-01-T3`; deterministic fixture fallback is permitted only if pipeline output is absent during execution.
- [x] Materialize browser-safe `public/data/entity-crossref.json` from `scripts/mappings/entity-crossref.json`. Covered by `03-01-T3`.
- [x] Add country boundary asset under `public/data/geo/` using locked `world-atlas/countries-110m.json`. Covered by `03-01-T3`.
- [x] Add build and bundle-size verification for the under-300KB initial bundle target. Covered by `03-01-T1` and `03-01-T3`.


## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Map camera zoom-first interaction feels coherent | FE-02 | Camera motion and hierarchy affordance need visual validation in a browser | Start dev server, click a country, confirm the map zooms/fits before deeper navigation dominates the screen. |
| Bloomberg/HUD aesthetic is restrained and readable | FE-07 | Visual quality and density are subjective but important for this product | Inspect desktop viewport and confirm dark glass panels, cyan/green accents, mono-heavy metrics, and table readability. |
| Bundle split preserves perceived startup | FE-08 | Build output proves size, but perceived load requires browser inspection | Open the app with network panel and confirm map/ranking shell renders before trend/detail chart chunks load. |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 180s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** revised pending execution
