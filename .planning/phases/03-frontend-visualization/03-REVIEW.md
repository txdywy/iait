---
phase: 03-frontend-visualization
status: fixed
files_reviewed: 41
findings:
  critical: 3
  warning: 1
  info: 0
  total: 4
reviewed_at: 2026-05-07
---

# Phase 03 Code Review

## Summary

A standard-depth review found three blocker issues and one warning. All findings were verified against the current codebase and fixed with regression coverage.

## Findings

### CR-01: TopoJSON country geometry was passed to GeoJSON-only join code

**Status:** fixed

`public/data/geo/countries-110m.json` is TopoJSON, while `joinCountryScores` expects a GeoJSON `FeatureCollection`. Passing the fetched topology directly caused map rendering to throw before the MapLibre source could render.

**Fix:** Added `topologyToCountryCollection` and converted fetched topology before joining scores. Kept the helper compatible with existing GeoJSON test fixtures.

**Regression:** `src/features/map/country-join.test.ts` now verifies world-atlas-style TopoJSON converts into joinable country GeoJSON.

### CR-02: Country cross-reference omitted emitted country ids

**Status:** fixed

The generated latest/ranking data included `br`, `tw`, and `be`, but `entity-crossref.json` lacked aliases for those country IDs. The choropleth join could not color or select those valid country signals.

**Fix:** Added Brazil, Taiwan, and Belgium aliases to `public/data/entity-crossref.json`.

**Regression:** `src/data/static-json.test.ts` now asserts every emitted country entity has a corresponding cross-reference alias.

### CR-03: Malformed route ids could throw during render

**Status:** fixed

`decodeURIComponent(id)` was called directly during render in `App` and `EntityDetailRoute`. Malformed user-controlled hash params could throw `URIError` and blank the app.

**Fix:** Added safe route parameter decoding that returns `null` for malformed encodings and falls back to the normal empty/not-found UI state.

**Regression:** Router and detail route tests now cover malformed encoded route IDs.

### WR-01: Confidence display scale mismatched normalized pipeline confidence

**Status:** fixed

The UI displayed confidence as `1/5` when generated data used normalized `1` as full confidence. This made high-confidence rows appear low-confidence.

**Fix:** `ConfidenceBadge` now maps values in the `0..1` normalized range onto the `1..5` display scale before rendering.

**Regression:** HUD and ranking tests now expect normalized confidence `1` to display as `5/5`.

## Verification

Fresh verification after fixes:

- `npm run typecheck` — passed
- `npm run build` — passed
- `npm run bundle:check` — passed (`95,421` bytes gzip initial entry)
- `npm test` — passed (`20` files, `122` tests)
- `npm run pipeline` — passed (`7,106` records, `0` written, `81` skipped unchanged)
