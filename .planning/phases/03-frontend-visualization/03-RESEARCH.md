# Phase 3: Frontend Visualization - Research

**Researched:** 2026-05-07 [VERIFIED: current session date]
**Domain:** Pure frontend React/Vite static data visualization, MapLibre choropleth drill-down, ECharts trends, GitHub Pages SPA deployment [VERIFIED: .planning/ROADMAP.md; VERIFIED: 03-CONTEXT.md]
**Confidence:** HIGH for locked stack and architecture constraints; MEDIUM for implementation sequencing because aggregate JSON and geography assets must be generated during the phase [VERIFIED: package.json; VERIFIED: public/data audit from research session]

<user_constraints>
## User Constraints (from CONTEXT.md)

Copied verbatim from `/Users/yiwei/ics/iait/.claude/worktrees/agent-ad4e0d690fcc7f508/.planning/phases/03-frontend-visualization/03-CONTEXT.md`. [VERIFIED: 03-CONTEXT.md]

### Locked Decisions

#### Exploration Flow
- **D-01:** The app opens map-first: the global MapLibre choropleth heatmap is the primary entry point, with rankings, trend summaries, and detail affordances supporting map exploration rather than replacing it.
- **D-02:** Country click behavior is zoom-first. Clicking a country should move the map into that country/region before presenting deeper entity navigation.
- **D-03:** Drill-down should use a hybrid model: map layers handle spatial progression (country fill → city markers → cloud-region markers), while a compact breadcrumb/detail rail preserves hierarchy, selected entity context, and discoverable next steps.
- **D-04:** Company entities should appear as an overlay layer on the map, but the UI must avoid implying exact physical data-center locations. Company overlays represent AI CapEx/corporate compute influence unless future data explicitly supports facility geography.
- **D-05:** Detail routes should still exist for shareability via HashRouter, but routing should not break the map-first exploration flow. URL state should reflect selected entity and level where practical.

#### HUD Visual Style
- **D-06:** Use a minimal dark interpretation of the Bloomberg Terminal aesthetic: restrained, readable, and premium rather than maximal data-wall density.
- **D-07:** Use cyan/green as the primary accent system. Cyan should carry interactive/map/selection affordances; green should carry positive capacity and growth signals. Warning/error/risk colors may be introduced sparingly where needed.
- **D-08:** Use mono-heavy typography, especially for metrics, labels, tables, IDs, rankings, and compact panels. Keep body copy readable, but the overall interface should feel terminal-native.
- **D-09:** Use glass panels over dark map/dashboard surfaces: translucent panels, blur, thin borders, and subtle glow. Planners should explicitly preserve contrast/readability and avoid overusing blur where tables or dense numbers need clarity.

#### Sparse Data, Confidence, and Freshness
- **D-10:** Claude has discretion for the remaining sparse-data display decisions. Default approach: show the compute index confidently as a trend signal, while making confidence/completeness visible in context instead of apologizing for every missing input.
- **D-11:** Encode confidence and completeness with compact badges and tooltips: confidence 1–5, `partial` vs `full`, freshness age, and source/factor availability should be visible on detail pages and summarized in map/detail rails.
- **D-12:** Sparse or partial entities should remain explorable and rankable unless the score is zero or unusable. The UI should visually de-emphasize low-confidence rows/markers rather than hiding them by default.
- **D-13:** Factor breakdowns should distinguish raw factor values, normalized factor scores, and weights so users can understand why an entity ranks highly without reading pipeline code.
- **D-14:** Risk tier and risk multiplier should be presented as modeling assumptions, not legal advice. Risk UI should be clear but not alarmist.

#### Map, Rankings, and Charts Balance
- **D-15:** Claude has discretion for the remaining map/chart balance decisions. Default approach: initial screen is map-first, but always includes a lightweight ranking/detail rail so users can compare entities without leaving the map.
- **D-16:** Respect the roadmap's under-300KB initial bundle target by code-splitting heavier visualization surfaces. Load MapLibre for the primary map experience; lazy-load ECharts-heavy trend/detail panels when selected or routed to.
- **D-17:** Rankings should be available for countries, cities, and cloud regions as first-class views/panels sorted by index score, with confidence and score change/freshness indicators where data exists.
- **D-18:** Trend charts should prioritize selected entity detail pages and drill-down panels over the initial map shell. The first screen should not block on chart bundles or historical data if the map/ranking shell can render first.
- **D-19:** Phase 3 should implement the 2D MapLibre choropleth and drill-down interactions only. Do not sneak in the deferred 3D globe or time-lapse animation.

### Claude's Discretion
- **D-20:** The user explicitly delegated all remaining Phase 3 decisions after selecting the core exploration and visual direction. Claude may choose component decomposition, state store shape, query keys, route names, loading states, map style source, chart option details, and responsive breakpoints as long as the decisions above and roadmap success criteria are met.
- **D-21:** If a choice conflicts with the project core value, prefer predictive trend exploration over absolute-number precision or exhaustive explanation.

### Deferred Ideas (OUT OF SCOPE)
- 3D globe view remains v2 and should not be included in Phase 3.
- Time-lapse animation remains v2 and should not be included in Phase 3.
- Methodology page, data export, and embeddable widgets remain deferred v2 items.
</user_constraints>

## Project Constraints (from CLAUDE.md)

- ComputeAtlas must remain a pure frontend architecture with no backend server and no database; all data is static JSON committed by automation. [VERIFIED: CLAUDE.md]
- Deployment must be GitHub Pages compatible, and all routing must work with static file serving. [VERIFIED: CLAUDE.md]
- Asset and data URLs should be compatible with the GitHub Pages base path; use Vite `base` and `import.meta.env.BASE_URL` for runtime static asset fetches. [VERIFIED: CLAUDE.md; CITED: https://vite.dev/guide/static-deploy]
- The project favors predictive trend value over strict absolute-number accuracy, and UI should expose confidence levels rather than hide inferred or sparse data. [VERIFIED: CLAUDE.md; VERIFIED: 03-CONTEXT.md]
- Phase 3 must not introduce paid API keys, backend services, databases, or human-operated data fetch steps. [VERIFIED: CLAUDE.md; VERIFIED: 03-CONTEXT.md]
- Use the locked frontend stack family: React, TypeScript, Vite, MapLibre GL JS, react-map-gl MapLibre bindings, ECharts, Zustand, TanStack React Query, Tailwind CSS 4, TopoJSON/GeoJSON utilities, and HashRouter. [VERIFIED: CLAUDE.md; VERIFIED: npm registry]
- Do not include Globe.gl, react-globe.gl, Three.js globe work, Cesium, time-lapse, methodology page, exports, or embeddable widgets in Phase 3. [VERIFIED: 03-CONTEXT.md; VERIFIED: .planning/STATE.md]
- The repo is currently pipeline-only and Phase 3 introduces the first React/Vite frontend source tree; existing `npm test` and `npm run pipeline` must remain functional. [VERIFIED: package.json; VERIFIED: 03-CONTEXT.md]

<phase_requirements>
## Phase Requirements

`/Users/yiwei/ics/iait/.claude/worktrees/agent-ad4e0d690fcc7f508/.planning/REQUIREMENTS.md` was requested but does not exist, so FE-01 through FE-09 descriptions below are inferred from Phase 3 success criteria and context. [VERIFIED: missing file read attempt; VERIFIED: .planning/ROADMAP.md; VERIFIED: 03-CONTEXT.md]

| ID | Description | Research Support |
|----|-------------|------------------|
| FE-01 | Global 2D MapLibre choropleth heatmap for country-level compute index. [VERIFIED: .planning/ROADMAP.md] | Use MapLibre GL JS + `react-map-gl/maplibre`, load country boundary TopoJSON/GeoJSON as static asset, join scores from `latest.json`. [CITED: https://visgl.github.io/react-map-gl/docs/get-started/maplibre-tutorial; CITED: https://maplibre.org/maplibre-gl-js/docs/examples/heatmap-layer/] |
| FE-02 | Drill-down country → city → cloud region → company/data-center-cluster context while keeping map-first flow. [VERIFIED: .planning/ROADMAP.md; VERIFIED: 03-CONTEXT.md] | Use MapLibre spatial layers plus breadcrumb/detail rail backed by `entity-crossref.json`; company overlays must be symbolic, not exact facilities. [VERIFIED: scripts/mappings/entity-crossref.json; VERIFIED: 03-CONTEXT.md] |
| FE-03 | Top-N ranking tables for countries, cities, and cloud regions sorted by score. [VERIFIED: .planning/ROADMAP.md] | Consume `rankings.json` shape generated by compiler key map (`countries`, `cities`, `cloudRegions`, `companies`) and join metadata from `latest.json`. [VERIFIED: scripts/compiler.ts] |
| FE-04 | Historical trend charts for selected entities. [VERIFIED: .planning/ROADMAP.md] | Lazy-load ECharts panels and fetch `history.json` on detail selection rather than initial shell load. [CITED: https://echarts.apache.org/handbook/en/basics/import/; CITED: https://react.dev/reference/react/lazy] |
| FE-05 | Entity detail pages show factor breakdown, source/confidence/risk/freshness. [VERIFIED: .planning/ROADMAP.md; VERIFIED: 03-CONTEXT.md] | Use `CompiledEntity.factorBreakdown`, `confidence`, `dataCompleteness`, `riskTier`, `riskMultiplier`, `lastUpdated`, and per-entity `series`. [VERIFIED: scripts/types.ts; VERIFIED: scripts/compiler.ts] |
| FE-06 | GitHub Pages-compatible routing. [VERIFIED: .planning/ROADMAP.md; VERIFIED: .planning/STATE.md] | Use React Router `HashRouter`; do not use `BrowserRouter` for static deep links. [CITED: https://reactrouter.com/api/declarative-routers/HashRouter] |
| FE-07 | Dark Bloomberg/HUD visual system with cyan/green accents and mono-heavy typography. [VERIFIED: 03-CONTEXT.md] | Use Tailwind CSS 4 via Vite plugin plus semantic UI tokens for dark panels, borders, glows, and density. [CITED: https://tailwindcss.com/docs/installation/using-vite] |
| FE-08 | Code-split initial bundle under 300KB. [VERIFIED: .planning/ROADMAP.md; VERIFIED: 03-CONTEXT.md] | Keep map shell lean, lazy-load chart/detail panels, use ECharts tree-shakable core imports, and inspect build output/bundle visualization. [CITED: https://vite.dev/guide/features.html#dynamic-import; CITED: https://echarts.apache.org/handbook/en/basics/import/] |
| FE-09 | Static-data-only frontend consuming Phase 2 generated JSON. [VERIFIED: CLAUDE.md; VERIFIED: 03-CONTEXT.md] | Fetch `latest.json`, `rankings.json`, `history.json`, `index-config.json`, per-entity files, and crossref data from static assets using React Query. [VERIFIED: scripts/compiler.ts; CITED: https://tanstack.com/query/latest/docs/framework/react/quick-start] |
</phase_requirements>

## Summary

Phase 3 should be planned as a browser-only static visualization application: React/Vite owns rendering, routing, state, and data fetching; MapLibre owns spatial exploration; ECharts owns deferred trend/detail chart surfaces; the existing pipeline remains the only producer of data. [VERIFIED: CLAUDE.md; VERIFIED: .planning/ROADMAP.md; VERIFIED: 03-CONTEXT.md] The planner should not allocate work to backend, database, API, or server-rendering tiers because these contradict project constraints. [VERIFIED: CLAUDE.md]

The highest-risk planning dependencies are data contract readiness and geography readiness, not library selection. [VERIFIED: scripts/compiler.ts; VERIFIED: public/data audit from research session] The compiler defines `latest.json`, `rankings.json`, and `history.json`, but the current top-level `public/data` state observed during research only included `index-config.json`, so Wave 0 should run or repair pipeline outputs before frontend acceptance tests depend on them. [VERIFIED: repository audit from research session; VERIFIED: scripts/compiler.ts] No local country boundary GeoJSON/TopoJSON asset was found during research, so the plan should add a static boundary asset, likely using `world-atlas` TopoJSON plus `topojson-client` conversion or pre-generated GeoJSON. [VERIFIED: repository audit from research session; VERIFIED: npm registry; CITED: https://github.com/topojson/world-atlas]

Use a map-first shell with a lightweight ranking/detail rail, HashRouter URL synchronization for shareable selections, and lazy-loaded ECharts/detail routes. [VERIFIED: 03-CONTEXT.md; CITED: https://reactrouter.com/api/declarative-routers/HashRouter; CITED: https://react.dev/reference/react/lazy] Protect the under-300KB initial bundle by avoiding eager ECharts imports, avoiding embedded country geometry in JS bundles, and measuring chunks in the Vite build. [VERIFIED: 03-CONTEXT.md; CITED: https://vite.dev/guide/features.html#dynamic-import]

**Primary recommendation:** Plan Phase 3 in waves: scaffold and data/asset contracts first, then map shell + ranking rail, then drill-down/detail/charts, with bundle-size and static-data tests as phase gates. [VERIFIED: .planning/ROADMAP.md; VERIFIED: 03-CONTEXT.md]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Static app rendering and navigation | Browser / Client | CDN / Static | React renders in the browser and GitHub Pages serves static assets; no server routing is allowed. [VERIFIED: CLAUDE.md; CITED: https://reactrouter.com/api/declarative-routers/HashRouter] |
| Data fetching and cache state | Browser / Client | CDN / Static | React Query fetches static JSON assets generated by pipeline and served by GitHub Pages. [VERIFIED: CLAUDE.md; CITED: https://tanstack.com/query/latest/docs/framework/react/quick-start] |
| Compute index scoring | Build/Pipeline | Browser / Client for display only | Existing compiler computes scores, factor breakdown, confidence, completeness, and risk; frontend should explain/display, not recompute authoritative scores. [VERIFIED: scripts/compiler.ts; VERIFIED: scripts/index-model.ts] |
| Country choropleth and spatial drill-down | Browser / Client | CDN / Static | MapLibre renders static geometry/data sources in-browser; boundary and JSON files are static assets. [CITED: https://maplibre.org/maplibre-gl-js/docs/examples/heatmap-layer/] |
| Rankings | Browser / Client | Build/Pipeline | Compiler writes ranking inputs; browser renders, filters, and links rows to map/detail state. [VERIFIED: scripts/compiler.ts] |
| Trend charts | Browser / Client | CDN / Static | ECharts renders historical series in-browser after lazy-loaded panels fetch `history.json`. [VERIFIED: scripts/compiler.ts; CITED: https://echarts.apache.org/handbook/en/basics/import/] |
| UI styling and visual density | Browser / Client | — | Tailwind CSS compiles styling for dark HUD panels and layout. [CITED: https://tailwindcss.com/docs/installation/using-vite] |
| Security boundaries | Browser / Client | CDN / Static | Main controls are safe rendering, defensive parsing, no frontend secrets, and no dynamic backend attack surface. [VERIFIED: CLAUDE.md; ASSUMED] |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react | 19.2.6; npm modified 2026-05-06T17:50:46.676Z [VERIFIED: npm registry] | UI component framework | Locked by project stack and compatible with React lazy/Suspense code splitting. [VERIFIED: CLAUDE.md; CITED: https://react.dev/reference/react/lazy] |
| react-dom | 19.2.6; npm modified 2026-05-06T17:50:54.602Z [VERIFIED: npm registry] | Browser DOM renderer | Required peer for React SPA rendering. [VERIFIED: npm registry] |
| typescript | ~5.9.3 currently installed [VERIFIED: package.json] | Type safety for static JSON, GeoJSON, and UI contracts | Existing project uses TypeScript and shared data contracts in `scripts/types.ts`. [VERIFIED: package.json; VERIFIED: scripts/types.ts] |
| vite | 8.0.10; npm modified 2026-04-23T05:19:36.728Z [VERIFIED: npm registry] | Dev server/build tool/static bundle | Project stack requires Vite; Vite supports static deployment, base path config, and dynamic import code splitting. [VERIFIED: CLAUDE.md; CITED: https://vite.dev/guide/static-deploy; CITED: https://vite.dev/guide/features.html#dynamic-import] |
| @vitejs/plugin-react | 6.0.1; npm modified 2026-03-13T10:43:19.935Z [VERIFIED: npm registry] | React integration for Vite | Standard Vite React plugin. [VERIFIED: npm registry; ASSUMED] |
| maplibre-gl | 5.24.0; npm modified 2026-05-03T15:36:00.801Z [VERIFIED: npm registry] | WebGL map renderer for choropleth/markers | Locked project choice; open-source map renderer with GeoJSON/layer APIs. [VERIFIED: CLAUDE.md; CITED: https://maplibre.org/maplibre-gl-js/docs/examples/heatmap-layer/] |
| react-map-gl | 8.1.1; npm modified 2026-04-11T00:17:29.789Z [VERIFIED: npm registry] | React wrapper for MapLibre | Official vis.gl wrapper supports `react-map-gl/maplibre` imports and MapLibre CSS setup. [CITED: https://visgl.github.io/react-map-gl/docs/get-started/maplibre-tutorial] |
| echarts | 6.0.0; npm modified 2025-07-30T02:38:35.078Z [VERIFIED: npm registry] | Trend and detail charts | Locked project choice; tree-shakable core imports reduce bundle size. [VERIFIED: CLAUDE.md; CITED: https://echarts.apache.org/handbook/en/basics/import/] |
| echarts-for-react | 3.0.6; npm modified 2026-01-21T04:38:21.347Z [VERIFIED: npm registry] | React wrapper for ECharts | Official wrapper supports core import path for optimized ECharts usage. [CITED: https://github.com/hustcc/echarts-for-react] |
| @tanstack/react-query | 5.100.9; npm modified 2026-05-03T14:48:43.188Z [VERIFIED: npm registry] | Static JSON async state/cache | Project stack choice; `QueryClientProvider` and `useQuery` fit static JSON loading with loading/error states. [VERIFIED: CLAUDE.md; CITED: https://tanstack.com/query/latest/docs/framework/react/quick-start] |
| zustand | 5.0.13; npm modified 2026-05-05T00:04:17.770Z [VERIFIED: npm registry] | Local UI exploration state | Project stack choice; official `create` store hook pattern fits selected entity, drill level, hover, and filters. [VERIFIED: CLAUDE.md; CITED: https://github.com/pmndrs/zustand] |
| react-router-dom | 7.15.0; npm modified 2026-05-05T14:33:04.295Z [VERIFIED: npm registry] | Client routing | Use `HashRouter` for static hosting where URL hash is not sent to the server. [VERIFIED: .planning/STATE.md; CITED: https://reactrouter.com/api/declarative-routers/HashRouter] |
| tailwindcss | 4.2.4; npm modified 2026-05-06T09:19:20.539Z [VERIFIED: npm registry] | Utility CSS/HUD theme | Project stack choice; v4 Vite setup uses `@tailwindcss/vite` and `@import "tailwindcss"`. [VERIFIED: CLAUDE.md; CITED: https://tailwindcss.com/docs/installation/using-vite] |
| @tailwindcss/vite | 4.2.4; npm modified 2026-05-06T09:19:42.920Z [VERIFIED: npm registry] | Tailwind Vite plugin | Official Tailwind v4 Vite integration. [CITED: https://tailwindcss.com/docs/installation/using-vite] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| topojson-client | 3.1.0; npm modified 2022-06-27T18:40:40.870Z [VERIFIED: npm registry] | Convert TopoJSON boundaries to GeoJSON | Use if boundary asset is kept as TopoJSON and converted client-side or in a build script. [VERIFIED: CLAUDE.md; CITED: https://github.com/topojson/topojson-client] |
| world-atlas | 2.0.2; npm modified 2022-06-29T03:26:43.652Z [VERIFIED: npm registry] | Prebuilt Natural Earth TopoJSON boundaries | Use to add country boundaries quickly; repository is archived/read-only and data is Natural Earth v4.1.0, so treat as static seed asset. [VERIFIED: npm registry; CITED: https://github.com/topojson/world-atlas] |
| @types/geojson | 7946.0.16; npm modified 2025-08-03T06:52:48.323Z [VERIFIED: npm registry] | GeoJSON TypeScript types | Use for typed boundary and point features. [VERIFIED: npm registry] |
| @types/topojson-client | 3.1.5; npm modified 2025-08-03T07:54:03.043Z [VERIFIED: npm registry] | TopoJSON client TypeScript types | Use when importing/converting TopoJSON in TS. [VERIFIED: npm registry] |
| @testing-library/react | 16.3.2; npm modified 2026-01-19T10:59:08.691Z [VERIFIED: npm registry] | React component tests | Add for route/layout/query state tests. [VERIFIED: npm registry; ASSUMED] |
| @testing-library/jest-dom | 6.9.1; npm modified 2025-12-13T20:20:49.513Z [VERIFIED: npm registry] | DOM matchers | Add with Vitest setup for accessible UI assertions. [VERIFIED: npm registry; ASSUMED] |
| jsdom | 29.1.1; npm modified 2026-04-30T08:52:48.629Z [VERIFIED: npm registry] | Browser-like test environment | Needed for React component tests in Vitest. [VERIFIED: npm registry; ASSUMED] |
| vite-bundle-visualizer | 1.2.1; npm modified 2024-05-12T07:24:20.709Z [VERIFIED: npm registry] | Bundle inspection | Use in a non-default analysis script if Vite build output is insufficient for enforcing 300KB initial bundle. [VERIFIED: npm registry; ASSUMED] |

### Alternatives Considered

Because user and project context locked the stack, alternatives below are rejection notes for planners, not open choices. [VERIFIED: CLAUDE.md; VERIFIED: 03-CONTEXT.md]

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| MapLibre GL JS | Leaflet | Reject for Phase 3 because project selected WebGL MapLibre and Leaflet lacks native WebGL choropleth/heatmap scale for this use case. [VERIFIED: CLAUDE.md] |
| MapLibre GL JS | Mapbox GL JS | Reject because project requires no paid API token and selected open-source MapLibre. [VERIFIED: CLAUDE.md] |
| ECharts | Recharts/D3/Plotly/Nivo | Reject because project selected ECharts and needs rich chart types with tree-shakable imports. [VERIFIED: CLAUDE.md; CITED: https://echarts.apache.org/handbook/en/basics/import/] |
| Zustand | Redux Toolkit/Context | Reject because project selected lightweight local UI state, not global enterprise state boilerplate. [VERIFIED: CLAUDE.md] |
| React Query | Plain `useEffect`/Axios/SWR | Reject because project selected React Query for static JSON loading/caching/error states. [VERIFIED: CLAUDE.md; CITED: https://tanstack.com/query/latest/docs/framework/react/quick-start] |
| HashRouter | BrowserRouter | Reject because GitHub Pages static hosting cannot serve arbitrary client routes without server fallback. [VERIFIED: .planning/STATE.md; CITED: https://reactrouter.com/api/declarative-routers/HashRouter] |
| 2D MapLibre only | Globe.gl / Three.js / Cesium | Reject for Phase 3 because 3D globe is explicitly deferred to v2. [VERIFIED: 03-CONTEXT.md; VERIFIED: .planning/STATE.md] |

**Installation:** [VERIFIED: npm registry]
```bash
npm install react@19.2.6 react-dom@19.2.6 maplibre-gl@5.24.0 react-map-gl@8.1.1 echarts@6.0.0 echarts-for-react@3.0.6 @tanstack/react-query@5.100.9 zustand@5.0.13 react-router-dom@7.15.0 tailwindcss@4.2.4 @tailwindcss/vite@4.2.4 topojson-client@3.1.0 world-atlas@2.0.2
npm install -D @vitejs/plugin-react@6.0.1 @types/react@19.2.14 @types/react-dom@19.2.3 @types/geojson@7946.0.16 @types/topojson-client@3.1.5 @testing-library/react@16.3.2 @testing-library/jest-dom@6.9.1 jsdom@29.1.1 vite-bundle-visualizer@1.2.1
```

**Version verification:** Versions above were verified with `npm view [package] version time.modified` during this research session. [VERIFIED: npm registry]

## Architecture Patterns

### System Architecture Diagram

```text
GitHub Actions / local pipeline
  └─ runs scripts/run-pipeline.ts + scripts/compiler.ts [VERIFIED: package.json; VERIFIED: scripts/compiler.ts]
       ├─ public/data/entities/{type}/{id}.json [VERIFIED: scripts/types.ts]
       ├─ public/data/latest.json [VERIFIED: scripts/compiler.ts]
       ├─ public/data/rankings.json [VERIFIED: scripts/compiler.ts]
       ├─ public/data/history.json [VERIFIED: scripts/compiler.ts]
       └─ public/data/index-config.json [VERIFIED: public/data/index-config.json]

GitHub Pages / static hosting [VERIFIED: CLAUDE.md]
  └─ serves /iait/ assets + static JSON via Vite base path [VERIFIED: CLAUDE.md; CITED: https://vite.dev/guide/static-deploy]

Browser React SPA
  ├─ HashRouter parses #/ routes and selected entity state [CITED: https://reactrouter.com/api/declarative-routers/HashRouter]
  ├─ QueryClient fetches static JSON from import.meta.env.BASE_URL [CITED: https://tanstack.com/query/latest/docs/framework/react/quick-start]
  ├─ Zustand stores selected level/entity, hover, viewport, ranking filters [CITED: https://github.com/pmndrs/zustand]
  ├─ Map Shell
  │    ├─ country choropleth joins boundary features to latest scores
  │    ├─ country click -> map fit/zoom -> city/cloud-region marker layers
  │    └─ company overlay -> symbolic corporate influence, not physical facility claim [VERIFIED: 03-CONTEXT.md]
  ├─ Ranking / Detail Rail
  │    ├─ top-N tables from rankings.json
  │    ├─ confidence/completeness/freshness badges
  │    └─ links update HashRouter route and map selection
  └─ Lazy Detail / Trend Surfaces
       ├─ ECharts modules imported only when rendered [CITED: https://echarts.apache.org/handbook/en/basics/import/]
       └─ history.json fetched after selection, not before initial map shell [VERIFIED: 03-CONTEXT.md]
```

### Recommended Project Structure

```text
src/
├── app/                    # Vite/React root, providers, routes, shell layout [ASSUMED]
├── components/             # Shared HUD panels, badges, tables, loading/error states [ASSUMED]
├── data/                   # Static JSON fetchers, query keys, runtime guards [ASSUMED]
├── features/map/           # MapLibre map shell, layers, interactions, viewport helpers [ASSUMED]
├── features/rankings/      # Top-N ranking rail and ranking pages/panels [ASSUMED]
├── features/details/       # Detail route, factor breakdown, freshness/risk displays [ASSUMED]
├── features/trends/        # Lazy ECharts trend components and chart option builders [ASSUMED]
├── store/                  # Zustand exploration store [ASSUMED]
├── styles/                 # Tailwind entry CSS and HUD theme tokens [ASSUMED]
└── types/                  # Frontend-safe generated/shared data contract types [ASSUMED]

public/data/
├── latest.json             # Generated by compiler; currently must be created/repaired before frontend gate [VERIFIED: scripts/compiler.ts; VERIFIED: data audit]
├── rankings.json           # Generated by compiler [VERIFIED: scripts/compiler.ts]
├── history.json            # Generated by compiler [VERIFIED: scripts/compiler.ts]
├── index-config.json       # Existing factor weights/confidence config [VERIFIED: public/data/index-config.json]
├── entities/               # Per-entity records generated by pipeline [VERIFIED: scripts/types.ts]
└── geo/                    # Add static country boundary TopoJSON/GeoJSON asset [VERIFIED: repo audit]
```

### Pattern 1: HashRouter for static deep links

**What:** Use `HashRouter` so route paths live after `#`, which is not sent to the static server. [CITED: https://reactrouter.com/api/declarative-routers/HashRouter]
**When to use:** Always for Phase 3 application routes on GitHub Pages. [VERIFIED: .planning/STATE.md; VERIFIED: 03-CONTEXT.md]
**Example:** [CITED: https://reactrouter.com/api/declarative-routers/HashRouter]
```tsx
import { HashRouter, Route, Routes } from 'react-router';

export function AppRouter() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<MapExplorer />} />
        <Route path="/entity/:type/:id" element={<EntityDetailRoute />} />
      </Routes>
    </HashRouter>
  );
}
```

### Pattern 2: Static JSON queries with base-path-safe URLs

**What:** Fetch generated JSON from the deployed static base path and cache it through React Query. [CITED: https://tanstack.com/query/latest/docs/framework/react/quick-start; CITED: https://vite.dev/guide/static-deploy]
**When to use:** For `latest.json`, `rankings.json`, `history.json`, `index-config.json`, and static mapping/geo assets. [VERIFIED: scripts/compiler.ts; VERIFIED: scripts/mappings/entity-crossref.json]
**Example:** [CITED: https://tanstack.com/query/latest/docs/framework/react/quick-start]
```ts
import { useQuery } from '@tanstack/react-query';

async function fetchStaticJson<T>(path: string): Promise<T> {
  const response = await fetch(`${import.meta.env.BASE_URL}${path}`);
  if (!response.ok) throw new Error(`Failed to load ${path}: ${response.status}`);
  return response.json() as Promise<T>;
}

export function useLatestIndex() {
  return useQuery({
    queryKey: ['data', 'latest'],
    queryFn: () => fetchStaticJson<LatestIndex>('data/latest.json'),
  });
}
```

### Pattern 3: MapLibre via react-map-gl MapLibre binding

**What:** Import Map from `react-map-gl/maplibre`, include MapLibre CSS, and use GeoJSON sources/layers for choropleth and markers. [CITED: https://visgl.github.io/react-map-gl/docs/get-started/maplibre-tutorial]
**When to use:** For the map-first shell and drill-down spatial layers. [VERIFIED: 03-CONTEXT.md]
**Example:** [CITED: https://visgl.github.io/react-map-gl/docs/get-started/maplibre-tutorial]
```tsx
import 'maplibre-gl/dist/maplibre-gl.css';
import Map, { Layer, Source } from 'react-map-gl/maplibre';

export function ComputeMap({ countries }: { countries: GeoJSON.FeatureCollection }) {
  return (
    <Map
      initialViewState={{ longitude: 0, latitude: 20, zoom: 1.2 }}
      mapStyle="https://demotiles.maplibre.org/style.json"
      interactiveLayerIds={['country-score-fill']}
    >
      <Source id="countries" type="geojson" data={countries}>
        <Layer
          id="country-score-fill"
          type="fill"
          paint={{
            'fill-color': ['interpolate', ['linear'], ['get', 'score'], 0, '#10202a', 100, '#00ff99'],
            'fill-opacity': 0.72,
          }}
        />
      </Source>
    </Map>
  );
}
```

### Pattern 4: Lazy-loaded ECharts detail panels

**What:** Register only needed ECharts modules and render chart panels behind route/selection-driven lazy boundaries. [CITED: https://echarts.apache.org/handbook/en/basics/import/; CITED: https://react.dev/reference/react/lazy]
**When to use:** For historical trend charts and heavier detail panels, not initial map shell. [VERIFIED: 03-CONTEXT.md]
**Example:** [CITED: https://echarts.apache.org/handbook/en/basics/import/; CITED: https://github.com/hustcc/echarts-for-react]
```tsx
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([LineChart, GridComponent, TooltipComponent, CanvasRenderer]);

export function TrendChart({ option }: { option: echarts.EChartsCoreOption }) {
  return <ReactEChartsCore echarts={echarts} option={option} notMerge lazyUpdate />;
}
```

### Pattern 5: Zustand for exploration state only

**What:** Keep selected entity, drill level, hover, active ranking scope, and map viewport intent in a small Zustand store. [CITED: https://github.com/pmndrs/zustand]
**When to use:** For client UI coordination that is not server data. [ASSUMED]
**Example:** [CITED: https://github.com/pmndrs/zustand]
```ts
import { create } from 'zustand';

interface ExplorerState {
  level: 'country' | 'city' | 'cloud-region' | 'company';
  selectedId: string | null;
  setSelection: (level: ExplorerState['level'], id: string | null) => void;
}

export const useExplorerStore = create<ExplorerState>((set) => ({
  level: 'country',
  selectedId: null,
  setSelection: (level, selectedId) => set({ level, selectedId }),
}));
```

### Anti-Patterns to Avoid

- **Recomputing authoritative index scores in React:** The compiler already computes scores and factor breakdowns; duplicating scoring in the frontend risks divergence. [VERIFIED: scripts/compiler.ts; VERIFIED: scripts/index-model.ts]
- **Using BrowserRouter on GitHub Pages:** Static hosting cannot serve arbitrary client routes; use HashRouter. [VERIFIED: .planning/STATE.md; CITED: https://reactrouter.com/api/declarative-routers/HashRouter]
- **Eagerly importing ECharts into the map shell:** ECharts has tree-shakable imports but should still be lazy-loaded to protect the under-300KB initial bundle target. [VERIFIED: 03-CONTEXT.md; CITED: https://echarts.apache.org/handbook/en/basics/import/]
- **Embedding large country geometry directly in JS:** MapLibre performance guidance favors reducing/simplifying GeoJSON and loading large data by URL rather than bloating JS bundles. [CITED: https://maplibre.org/maplibre-gl-js/docs/guides/large-data/]
- **Displaying company overlays as precise facility locations:** Context requires company overlays to represent corporate compute influence unless future data supports physical facility geography. [VERIFIED: 03-CONTEXT.md]
- **Hiding sparse data by default:** Context requires partial entities to remain explorable/rankable unless score is zero or unusable. [VERIFIED: 03-CONTEXT.md]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| WebGL map rendering, feature picking, camera movement | Custom canvas/WebGL map engine | MapLibre GL JS + react-map-gl | MapLibre already provides map, source, layer, event, popup, `fitBounds`, and rendered-feature query APIs. [CITED: https://maplibre.org/maplibre-gl-js/docs/API/classes/Map/] |
| Static SPA routing fallback | Custom hash parser/router | React Router `HashRouter` | HashRouter is designed for hash-based routing where URL hash is not sent to the server. [CITED: https://reactrouter.com/api/declarative-routers/HashRouter] |
| Async JSON cache/loading/error state | Ad hoc `useEffect` cache | TanStack React Query | QueryClient/useQuery standardize async state and caching. [CITED: https://tanstack.com/query/latest/docs/framework/react/quick-start] |
| Global UI selection state | Prop drilling or broad Context | Zustand | Zustand store hooks support small shared client state with immutable updates. [CITED: https://github.com/pmndrs/zustand] |
| Chart rendering and transitions | Custom SVG/canvas charts | ECharts + echarts-for-react core wrapper | ECharts provides line/bar/etc. modules and tree-shakable registration. [CITED: https://echarts.apache.org/handbook/en/basics/import/] |
| Country boundary dataset | Manual coordinate drawing | `world-atlas`/Natural Earth-derived TopoJSON or prepared GeoJSON | `world-atlas` packages prebuilt country TopoJSON; manual geometries are error-prone. [VERIFIED: npm registry; CITED: https://github.com/topojson/world-atlas] |
| Index methodology computation | Frontend scoring clone | Existing compiler/model outputs | `scripts/compiler.ts` and `scripts/index-model.ts` own scoring, confidence, aggregation, risk, and factor breakdown. [VERIFIED: scripts/compiler.ts; VERIFIED: scripts/index-model.ts] |
| CSS runtime theme system | Custom runtime CSS-in-JS engine | Tailwind CSS 4 + CSS variables/classes | Tailwind generates static CSS with zero runtime. [CITED: https://tailwindcss.com/docs/installation/using-vite] |

**Key insight:** Phase 3 complexity is integration complexity: static data contracts, geometry joins, UI state synchronization, and bundle budgets. [VERIFIED: scripts/types.ts; VERIFIED: 03-CONTEXT.md] Hand-rolling map/chart/router/query primitives would add edge cases without advancing ComputeAtlas-specific value. [ASSUMED]

## Common Pitfalls

### Pitfall 1: Missing generated aggregate JSON blocks frontend verification
**What goes wrong:** The map/rankings/detail UI expects `latest.json`, `rankings.json`, and `history.json`, but top-level `public/data` did not contain those files during research. [VERIFIED: scripts/compiler.ts; VERIFIED: repository audit from research session]
**Why it happens:** Compiler outputs exist in code, but the pipeline must run successfully to materialize static JSON before UI tests/build verification. [VERIFIED: scripts/compiler.ts; VERIFIED: package.json]
**How to avoid:** Add Wave 0 task to run/repair `npm run pipeline`, commit or generate fixture outputs, and fail clearly if required JSON is absent. [ASSUMED]
**Warning signs:** React Query 404s for `data/latest.json`, rankings panel empty, detail routes cannot resolve entities. [ASSUMED]

### Pitfall 2: Boundary join mismatch between ISO/name systems
**What goes wrong:** `world-atlas` country IDs use ISO 3166-1 numeric IDs and `properties.name`, while ComputeAtlas countries use lowercase IDs such as `us` plus ISO2/ISO3/name fields in `entity-crossref.json`. [CITED: https://github.com/topojson/world-atlas; VERIFIED: scripts/mappings/entity-crossref.json]
**Why it happens:** Geographic datasets and pipeline entity IDs use different identifiers. [VERIFIED: scripts/mappings/entity-crossref.json; CITED: https://github.com/topojson/world-atlas]
**How to avoid:** Add an explicit country join helper/table that maps ComputeAtlas country IDs to boundary features using ISO/name metadata; test all MVP countries. [ASSUMED]
**Warning signs:** Countries render with missing scores, choropleth appears blank, or countries like United States/United Kingdom fail to join consistently. [ASSUMED]

### Pitfall 3: Bundle budget failure from eager visualization imports
**What goes wrong:** Initial chunk exceeds 300KB when MapLibre, ECharts, large geometry, and detail panels all load at startup. [VERIFIED: 03-CONTEXT.md; CITED: https://vite.dev/guide/features.html#dynamic-import]
**Why it happens:** Static imports are included in the initial dependency graph, and large JSON/geometry embedded in JS increases chunk size. [CITED: https://vite.dev/guide/features.html#dynamic-import; CITED: https://maplibre.org/maplibre-gl-js/docs/guides/large-data/]
**How to avoid:** Lazy-load ECharts/detail panels, load geography as static URL data, use ECharts core imports, and inspect gzip build output. [CITED: https://echarts.apache.org/handbook/en/basics/import/; CITED: https://react.dev/reference/react/lazy]
**Warning signs:** `dist/assets/index-*.js` gzip >300KB, chart code appears in initial bundle report, or country boundary JSON appears embedded in JS. [ASSUMED]

### Pitfall 4: GitHub Pages route breaks on refresh/deep link
**What goes wrong:** Direct navigation to `/entity/country/us` 404s on GitHub Pages. [VERIFIED: .planning/STATE.md; CITED: https://reactrouter.com/api/declarative-routers/HashRouter]
**Why it happens:** BrowserRouter sends path to the static host, which has no server fallback. [ASSUMED]
**How to avoid:** Use `HashRouter` and route as `#/entity/country/us`. [CITED: https://reactrouter.com/api/declarative-routers/HashRouter]
**Warning signs:** Local dev route works but GitHub Pages refresh fails. [ASSUMED]

### Pitfall 5: Map-first flow degraded by routing-first UI
**What goes wrong:** Detail pages replace the map as primary interaction, contradicting D-01 and D-05. [VERIFIED: 03-CONTEXT.md]
**Why it happens:** Planner splits routes before defining shared map shell/selection synchronization. [ASSUMED]
**How to avoid:** Build persistent map shell and side rail first; detail routes should synchronize selection rather than become a separate app. [VERIFIED: 03-CONTEXT.md]
**Warning signs:** Clicking a country navigates away immediately instead of zooming first. [VERIFIED: 03-CONTEXT.md]

### Pitfall 6: Confidence/risk UI sounds like legal or empirical certainty
**What goes wrong:** Risk tiers or low-confidence data appear as legal conclusions or precise capacity estimates. [VERIFIED: 03-CONTEXT.md; VERIFIED: CLAUDE.md]
**Why it happens:** Detail labels omit modeling-assumption context. [ASSUMED]
**How to avoid:** Label risk multiplier as modeling assumption, show confidence/completeness/freshness badges, and keep trend-signal framing. [VERIFIED: 03-CONTEXT.md]
**Warning signs:** Copy says “export controlled” or “verified capacity” without confidence context. [ASSUMED]

## Code Examples

Verified patterns from official sources and current code contracts. [VERIFIED: docs and repo files listed below]

### Vite + Tailwind CSS 4 setup
```ts
// Source: https://tailwindcss.com/docs/installation/using-vite [CITED]
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: '/iait/',
  plugins: [react(), tailwindcss()],
});
```

```css
/* Source: https://tailwindcss.com/docs/installation/using-vite [CITED] */
@import "tailwindcss";
```

### React Query provider
```tsx
// Source: https://tanstack.com/query/latest/docs/framework/react/quick-start [CITED]
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
```

### React lazy route boundary
```tsx
// Source: https://react.dev/reference/react/lazy [CITED]
import { lazy, Suspense } from 'react';

const EntityDetailRoute = lazy(() => import('../features/details/EntityDetailRoute'));

export function LazyDetailBoundary() {
  return (
    <Suspense fallback={<div className="font-mono text-cyan-200">Loading detail...</div>}>
      <EntityDetailRoute />
    </Suspense>
  );
}
```

### Compiler output contracts the frontend consumes
```ts
// Source: scripts/types.ts and scripts/compiler.ts [VERIFIED]
interface CompiledEntity {
  type: 'country' | 'city' | 'cloud-region' | 'company';
  name: string;
  score: number;
  factors: Record<string, number>;
  confidence: number;
  lastUpdated: string;
  riskTier?: string;
  riskMultiplier?: number;
  factorBreakdown?: Record<string, { raw: number; normalized: number; weight: number }>;
  dataCompleteness?: 'full' | 'partial';
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Create React App scaffold | Vite React static build | Vite is the locked project stack in current CLAUDE.md and supports static deployment/code splitting. [VERIFIED: CLAUDE.md; CITED: https://vite.dev/guide/static-deploy] | Planner should add Vite entry files/scripts, not CRA. [VERIFIED: package.json] |
| BrowserRouter for SPA routes | HashRouter for GitHub Pages | Locked before Phase 3 in project state. [VERIFIED: .planning/STATE.md] | Route URLs should use hash fragments for shareability. [CITED: https://reactrouter.com/api/declarative-routers/HashRouter] |
| Full ECharts namespace import in initial bundle | ECharts core imports + lazy chart panels | ECharts handbook documents tree-shakable imports. [CITED: https://echarts.apache.org/handbook/en/basics/import/] | Initial map shell can avoid chart bundle cost. [VERIFIED: 03-CONTEXT.md] |
| 3D globe hero in Phase 3 | 2D MapLibre choropleth only | Phase context deferred globe/time-lapse to v2. [VERIFIED: 03-CONTEXT.md] | Do not install or plan Globe.gl/Three.js work in Phase 3. [VERIFIED: 03-CONTEXT.md] |
| Client recomputation of methodology | Compiler-produced scores/factors displayed by UI | Phase 2 compiler now writes score, confidence, risk, breakdown fields. [VERIFIED: scripts/compiler.ts; VERIFIED: scripts/types.ts] | Frontend should consume and explain outputs. [VERIFIED: scripts/index-model.ts] |

**Deprecated/outdated:**
- `BrowserRouter` for this project: not appropriate for GitHub Pages static deep links; use `HashRouter`. [VERIFIED: .planning/STATE.md; CITED: https://reactrouter.com/api/declarative-routers/HashRouter]
- Globe.gl/React Globe.gl in Phase 3: previously researched but explicitly deferred to v2. [VERIFIED: 03-CONTEXT.md; VERIFIED: .planning/STATE.md]
- Hand-authored large GeoJSON in source modules: avoid because MapLibre guidance recommends reducing/simplifying/loading large data appropriately. [CITED: https://maplibre.org/maplibre-gl-js/docs/guides/large-data/]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Security controls are mainly browser-side safe rendering/schema validation/no secrets because there is no backend. | Architectural Responsibility Map / Security Domain | If future frontend adds external APIs or auth, ASVS scope expands materially. |
| A2 | Suggested `src/` project structure is appropriate for first React frontend. | Recommended Project Structure | Planner may choose different folder names; low risk if responsibilities stay clear. |
| A3 | Zustand should only hold exploration UI state, not fetched server/static data. | Pattern 5 | Overusing React Query or Zustand could cause duplicated state; medium maintainability risk. |
| A4 | Wave 0 should materialize aggregate JSON and fixture data before UI work. | Summary / Pitfalls | If aggregate outputs already appear before execution, Wave 0 can shrink; if skipped while absent, UI tests will fail. |
| A5 | Bundle-budget warning signs can be enforced with Vite gzip output and optional visualizer. | Pitfalls / Validation | If build tooling output changes, planner may need another measurement command. |
| A6 | `world-atlas` is sufficient as a seed country boundary asset despite being archived. | Standard Stack / Pitfalls | If country matching/resolution is insufficient, planner must select another static boundary source. |

## Open Questions (RESOLVED)

1. **Where are formal FE-01 through FE-09 requirement descriptions?**
   - Resolution: top-level `.planning/REQUIREMENTS.md` is absent in this planning cycle, so `.planning/ROADMAP.md` Phase 3 success criteria plus `03-CONTEXT.md` decisions are authoritative for FE-01 through FE-09.
   - Planning consequence: plan frontmatter keeps FE-01..FE-09 coverage mapped to ROADMAP success criteria; if a future REQUIREMENTS artifact appears, it supersedes this inferred mapping in a later revision.

2. **Should aggregate JSON be committed as fixtures, generated during planning Wave 0, or both?**
   - Resolution: Plan 03-01 must run `npm run pipeline` before UI tests rely on aggregate data and verify that `public/data/latest.json`, `public/data/rankings.json`, and `public/data/history.json` exist.
   - Planning consequence: deterministic fixture fallback is allowed only if pipeline output is absent during execution, and that fallback must be explicitly browser-safe/static and limited to enabling UI tests against the same aggregate contract.

3. **Which country boundary asset should be locked?**
   - Resolution: lock `world-atlas/countries-110m.json` copied to `public/data/geo/countries-110m.json` for MVP.
   - Planning consequence: Phase 3 loads country boundaries as a public static asset, not as an imported JS module, and upgrades to higher-resolution geometry only in a future planning cycle if visual quality proves insufficient.

4. **How should data center clusters appear if no cluster entity type exists yet?**
   - Resolution: do not count an unavailable placeholder as FE-02 completion. Phase 3 must derive a real cluster-level frontend contract from current cross-reference data by creating modeled cluster nodes per cloud region.
   - Required cluster contract: each derived node uses id `${cloudRegionId}-cluster`, level `data-center-cluster`, parent cloud region id, provider, country, city, label `${provider.toUpperCase()} ${city} data center cluster`, and copy stating it is a modeled cluster proxy, not a verified facility.
   - Planning consequence: map/drill-down helpers and tests must include these derived cluster nodes, and UI copy must avoid claiming verified data-center facility locations.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | Vite/npm/test/pipeline | ✓ but version-range mismatch | v25.9.0 observed; package engine requires `^20.19.0` [VERIFIED: environment audit; VERIFIED: package.json] | Use Node 20.19.x via local toolchain/nvm/CI if engine-strict or dependency compatibility fails. [ASSUMED] |
| npm | Package install/scripts | ✓ | 11.12.1 observed [VERIFIED: environment audit] | Use CI/npm bundled with Node 20.19.x if needed. [ASSUMED] |
| npx | Context7 fallback/package tooling | ✓ | 11.12.1 observed [VERIFIED: environment audit] | Use npm scripts directly. [ASSUMED] |
| git | Commit/status checks | ✓ | 2.54.0 observed [VERIFIED: environment audit] | — |
| Vitest | Unit/component tests | ✓ | ~4.1.5 installed [VERIFIED: package.json] | — |
| jsdom | React component tests | ✗ currently absent | — [VERIFIED: package.json] | Add `jsdom` dev dependency in frontend scaffold wave. [VERIFIED: npm registry] |
| React Testing Library | Component tests | ✗ currently absent | — [VERIFIED: package.json] | Add `@testing-library/react` and `@testing-library/jest-dom`. [VERIFIED: npm registry] |
| Frontend runtime deps | Phase 3 UI | ✗ currently absent | — [VERIFIED: package.json] | Install locked stack packages in Wave 0. [VERIFIED: npm registry] |
| Country boundary asset | Map choropleth | ✗ currently absent | — [VERIFIED: repository audit] | Add `world-atlas`/TopoJSON static asset or generated GeoJSON. [VERIFIED: npm registry; CITED: https://github.com/topojson/world-atlas] |

**Missing dependencies with no fallback:**
- Frontend dependencies and a country boundary asset are required before implementing FE-01. [VERIFIED: package.json; VERIFIED: repository audit]
- `jsdom`/Testing Library are required for meaningful React component tests. [VERIFIED: package.json; ASSUMED]

**Missing dependencies with fallback:**
- Node version mismatch may be handled by using Node 20.19.x in local environment/CI; current Node 25 may still run commands but does not satisfy the declared engine. [VERIFIED: package.json; VERIFIED: environment audit; ASSUMED]

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ~4.1.5 currently installed. [VERIFIED: package.json] |
| Config file | `/Users/yiwei/ics/iait/.claude/worktrees/agent-ad4e0d690fcc7f508/vitest.config.ts` includes `scripts/**/*.test.ts` and `src/**/*.test.{ts,tsx}`. [VERIFIED: vitest.config.ts] |
| Quick run command | `npm test -- --run src/` after frontend tests exist. [VERIFIED: package.json; ASSUMED] |
| Full suite command | `npm test` [VERIFIED: package.json] |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FE-01 | Choropleth joins country boundaries to latest scores and renders score layer. [VERIFIED: .planning/ROADMAP.md] | unit/component | `npm test -- src/features/map/country-join.test.ts -x` [ASSUMED] | ❌ Wave 0 |
| FE-02 | Country click zooms first and updates selected hierarchy/detail rail. [VERIFIED: 03-CONTEXT.md] | unit/component | `npm test -- src/features/map/drilldown.test.tsx -x` [ASSUMED] | ❌ Wave 0 |
| FE-03 | Ranking tables sort countries/cities/cloud regions by score and show confidence/freshness. [VERIFIED: .planning/ROADMAP.md] | unit/component | `npm test -- src/features/rankings/rankings.test.tsx -x` [ASSUMED] | ❌ Wave 0 |
| FE-04 | Trend chart option builder converts history series to ECharts options and lazy panel loads only on demand. [VERIFIED: .planning/ROADMAP.md; VERIFIED: 03-CONTEXT.md] | unit | `npm test -- src/features/trends/trend-options.test.ts -x` [ASSUMED] | ❌ Wave 0 |
| FE-05 | Detail view displays factor raw/normalized/weight, confidence, risk, freshness. [VERIFIED: .planning/ROADMAP.md; VERIFIED: scripts/types.ts] | component | `npm test -- src/features/details/entity-detail.test.tsx -x` [ASSUMED] | ❌ Wave 0 |
| FE-06 | Routes use hash paths and static detail URLs remain shareable. [VERIFIED: .planning/STATE.md] | component | `npm test -- src/app/router.test.tsx -x` [ASSUMED] | ❌ Wave 0 |
| FE-07 | HUD theme tokens/classes render dark panels with readable labels. [VERIFIED: 03-CONTEXT.md] | component/snapshot-light | `npm test -- src/components/hud-panel.test.tsx -x` [ASSUMED] | ❌ Wave 0 |
| FE-08 | Initial bundle stays under 300KB gzip. [VERIFIED: .planning/ROADMAP.md] | build gate | `npm run build` plus chunk-size check script [ASSUMED] | ❌ Wave 0 |
| FE-09 | Static JSON fetchers use `import.meta.env.BASE_URL` and expose loading/error states. [VERIFIED: CLAUDE.md; CITED: https://vite.dev/guide/static-deploy] | unit | `npm test -- src/data/static-json.test.ts -x` [ASSUMED] | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** Run the most specific Vitest file plus TypeScript check/build smoke if the task touches routes or data contracts. [ASSUMED]
- **Per wave merge:** `npm test` and `npm run build` once build script exists. [VERIFIED: package.json; ASSUMED]
- **Phase gate:** Full suite green, `npm run pipeline` still works, `npm run build` succeeds, and initial bundle measurement satisfies <300KB. [VERIFIED: package.json; VERIFIED: .planning/ROADMAP.md]

### Wave 0 Gaps

- [ ] Add frontend dependencies and Vite scripts: `dev`, `build`, `preview`, maybe `typecheck`. [VERIFIED: package.json; VERIFIED: npm registry]
- [ ] Add React test environment dependencies: `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, and Vitest setup file. [VERIFIED: package.json; VERIFIED: npm registry]
- [ ] Add deterministic static JSON fixtures or materialize `latest.json`, `rankings.json`, and `history.json`. [VERIFIED: scripts/compiler.ts; VERIFIED: repository audit]
- [ ] Add country boundary fixture/asset and join tests covering all MVP country IDs. [VERIFIED: scripts/mappings/entity-crossref.json; VERIFIED: repository audit]
- [ ] Add build/bundle-size check for under-300KB initial bundle. [VERIFIED: .planning/ROADMAP.md; ASSUMED]

## Security Domain

Security enforcement is enabled because `.planning/config.json` does not set `security_enforcement` to `false`. [VERIFIED: .planning/config.json]

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | No | No authentication is in Phase 3 scope. [VERIFIED: CLAUDE.md; VERIFIED: 03-CONTEXT.md] |
| V3 Session Management | No | No sessions are in Phase 3 scope. [VERIFIED: CLAUDE.md; VERIFIED: 03-CONTEXT.md] |
| V4 Access Control | No | Static public data has no protected resources in Phase 3. [VERIFIED: CLAUDE.md; ASSUMED] |
| V5 Input Validation | Yes | Validate/defensively parse static JSON shape before rendering critical UI; never assume optional fields exist. [VERIFIED: scripts/types.ts; ASSUMED] |
| V6 Cryptography | No | No cryptographic feature is in Phase 3 scope; do not hand-roll crypto. [VERIFIED: 03-CONTEXT.md; ASSUMED] |
| V12 File and Resources | Yes | Fetch only static project assets via base-path-safe relative URLs and handle 404/network failures. [CITED: https://vite.dev/guide/static-deploy; ASSUMED] |
| V14 Configuration | Yes | Keep Vite base path and GitHub Pages route mode explicit; do not expose secrets in frontend env. [VERIFIED: CLAUDE.md; ASSUMED] |

### Known Threat Patterns for React static visualization stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Rendering untrusted strings from JSON as HTML | Tampering / XSS | Render data labels as normal text, not raw HTML; sanitize if rich text is ever introduced. [ASSUMED] |
| Malformed or missing static JSON breaks app shell | Denial of Service | React Query error states, schema guards, fallback empty states, and tests for absent optional fields. [VERIFIED: scripts/types.ts; ASSUMED] |
| Secret leakage in frontend config | Information Disclosure | Do not put API keys/secrets in Vite public env or static JSON. [VERIFIED: CLAUDE.md; ASSUMED] |
| Stale cached deployment chunks after redeploy | Denial of Service | Handle dynamic import failures and keep app reload path; Vite documents `vite:preloadError` for dynamic import load failures. [CITED: https://vite.dev/guide/build] |
| Misleading exact-location claims for companies | Spoofing / Integrity | Label company layer as corporate influence overlay, not exact data-center location. [VERIFIED: 03-CONTEXT.md] |

## Sources

### Primary (HIGH confidence)

- `/Users/yiwei/ics/iait/.claude/worktrees/agent-ad4e0d690fcc7f508/CLAUDE.md` - project constraints, locked stack, GitHub Pages/static architecture. [VERIFIED]
- `/Users/yiwei/ics/iait/.claude/worktrees/agent-ad4e0d690fcc7f508/.planning/phases/03-frontend-visualization/03-CONTEXT.md` - user decisions, deferred items, phase boundary. [VERIFIED]
- `/Users/yiwei/ics/iait/.claude/worktrees/agent-ad4e0d690fcc7f508/.planning/ROADMAP.md` - Phase 3 goal, FE IDs, success criteria. [VERIFIED]
- `/Users/yiwei/ics/iait/.claude/worktrees/agent-ad4e0d690fcc7f508/.planning/STATE.md` - current phase, deferred v2 items, HashRouter decision. [VERIFIED]
- `/Users/yiwei/ics/iait/.claude/worktrees/agent-ad4e0d690fcc7f508/package.json` - existing scripts/dependencies/Node engine. [VERIFIED]
- `/Users/yiwei/ics/iait/.claude/worktrees/agent-ad4e0d690fcc7f508/vitest.config.ts` - Vitest include/exclude config. [VERIFIED]
- `/Users/yiwei/ics/iait/.claude/worktrees/agent-ad4e0d690fcc7f508/scripts/types.ts` - data contracts. [VERIFIED]
- `/Users/yiwei/ics/iait/.claude/worktrees/agent-ad4e0d690fcc7f508/scripts/compiler.ts` - aggregate output shapes. [VERIFIED]
- `/Users/yiwei/ics/iait/.claude/worktrees/agent-ad4e0d690fcc7f508/scripts/index-model.ts` - score/confidence/risk behavior. [VERIFIED]
- `/Users/yiwei/ics/iait/.claude/worktrees/agent-ad4e0d690fcc7f508/scripts/mappings/entity-crossref.json` - entity relationships. [VERIFIED]
- npm registry - current package versions and modified dates for recommended dependencies. [VERIFIED]

### Official documentation (HIGH/MEDIUM confidence)

- [React lazy](https://react.dev/reference/react/lazy) - lazy component code splitting. [CITED]
- [Vite Static Deploy](https://vite.dev/guide/static-deploy) - static deployment and base path guidance. [CITED]
- [Vite Features: Dynamic Import](https://vite.dev/guide/features.html#dynamic-import) - dynamic imports/code splitting. [CITED]
- [Vite Build](https://vite.dev/guide/build) - build output and `vite:preloadError`. [CITED]
- [React Router HashRouter](https://reactrouter.com/api/declarative-routers/HashRouter) - hash routing behavior. [CITED]
- [react-map-gl MapLibre tutorial](https://visgl.github.io/react-map-gl/docs/get-started/maplibre-tutorial) - MapLibre binding import/CSS setup. [CITED]
- [MapLibre heatmap example](https://maplibre.org/maplibre-gl-js/docs/examples/heatmap-layer/) - GeoJSON source/layer heatmap patterns. [CITED]
- [MapLibre Map API](https://maplibre.org/maplibre-gl-js/docs/API/classes/Map/) - map events/camera/features APIs. [CITED]
- [MapLibre large data guide](https://maplibre.org/maplibre-gl-js/docs/guides/large-data/) - GeoJSON performance guidance. [CITED]
- [ECharts import handbook](https://echarts.apache.org/handbook/en/basics/import/) - tree-shakable imports and renderer registration. [CITED]
- [echarts-for-react README](https://github.com/hustcc/echarts-for-react) - React wrapper and core usage. [CITED]
- [TanStack React Query quick start](https://tanstack.com/query/latest/docs/framework/react/quick-start) - QueryClientProvider/useQuery. [CITED]
- [Zustand README](https://github.com/pmndrs/zustand) - create store hook pattern. [CITED]
- [Tailwind CSS Vite installation](https://tailwindcss.com/docs/installation/using-vite) - v4 plugin and CSS import. [CITED]
- [world-atlas README](https://github.com/topojson/world-atlas) - Natural Earth TopoJSON files and fields. [CITED]

### Secondary (MEDIUM confidence)

- Prior project research files under `/Users/yiwei/ics/iait/.claude/worktrees/agent-ad4e0d690fcc7f508/.planning/research/` were used as background only where consistent with Phase 3 context. [VERIFIED: repository reads from research session]

### Tertiary (LOW confidence)

- No unverified WebSearch-only sources were used as authoritative recommendations. [VERIFIED: research session notes]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - package versions verified via npm registry and stack locked by project instructions. [VERIFIED: npm registry; VERIFIED: CLAUDE.md]
- Architecture: HIGH - pure frontend/static/GitHub Pages constraints are explicit in CLAUDE.md, ROADMAP, STATE, and Phase 3 context. [VERIFIED: CLAUDE.md; VERIFIED: .planning/ROADMAP.md; VERIFIED: .planning/STATE.md; VERIFIED: 03-CONTEXT.md]
- Data contracts: HIGH for TypeScript/compiler shapes; MEDIUM for runtime availability because aggregate JSON outputs were not present in current top-level data directory during research. [VERIFIED: scripts/types.ts; VERIFIED: scripts/compiler.ts; VERIFIED: repository audit]
- Pitfalls: MEDIUM - grounded in official docs and current repo gaps, with some implementation warning signs marked assumed. [CITED: official docs; ASSUMED]
- Validation: MEDIUM - Vitest config exists, but React/jsdom/frontend test files do not yet exist. [VERIFIED: vitest.config.ts; VERIFIED: package.json]
- Security: MEDIUM - no auth/backend scope is verified, but detailed ASVS mitigations are assumed from static React app patterns. [VERIFIED: CLAUDE.md; ASSUMED]

**Research date:** 2026-05-07 [VERIFIED: current session date]
**Valid until:** 2026-05-14 for npm package versions and frontend-doc details; 2026-06-06 for project architecture constraints unless CONTEXT.md changes. [ASSUMED]
