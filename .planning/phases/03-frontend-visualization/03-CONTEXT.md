# Phase 3: Frontend Visualization - Context

**Gathered:** 2026-05-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the first user-facing ComputeAtlas frontend: a pure React/Vite static app where users explore the Phase 2 compute index through a MapLibre 2D global heatmap, zoom-based drill-down, rankings, ECharts trend charts, and entity detail pages. The experience should be desktop-first, GitHub Pages compatible, Bloomberg/HUD-inspired but visually restrained, and powered only by static JSON outputs under `public/data/`.

This phase does NOT build the 3D globe, GitHub Actions automation, LLM extraction, data export, methodology page, widgets, or new data pipeline sources. 3D globe and time-lapse animation remain deferred to v2.

</domain>

<decisions>
## Implementation Decisions

### Exploration Flow
- **D-01:** The app opens map-first: the global MapLibre choropleth heatmap is the primary entry point, with rankings, trend summaries, and detail affordances supporting map exploration rather than replacing it.
- **D-02:** Country click behavior is zoom-first. Clicking a country should move the map into that country/region before presenting deeper entity navigation.
- **D-03:** Drill-down should use a hybrid model: map layers handle spatial progression (country fill → city markers → cloud-region markers), while a compact breadcrumb/detail rail preserves hierarchy, selected entity context, and discoverable next steps.
- **D-04:** Company entities should appear as an overlay layer on the map, but the UI must avoid implying exact physical data-center locations. Company overlays represent AI CapEx/corporate compute influence unless future data explicitly supports facility geography.
- **D-05:** Detail routes should still exist for shareability via HashRouter, but routing should not break the map-first exploration flow. URL state should reflect selected entity and level where practical.

### HUD Visual Style
- **D-06:** Use a minimal dark interpretation of the Bloomberg Terminal aesthetic: restrained, readable, and premium rather than maximal data-wall density.
- **D-07:** Use cyan/green as the primary accent system. Cyan should carry interactive/map/selection affordances; green should carry positive capacity and growth signals. Warning/error/risk colors may be introduced sparingly where needed.
- **D-08:** Use mono-heavy typography, especially for metrics, labels, tables, IDs, rankings, and compact panels. Keep body copy readable, but the overall interface should feel terminal-native.
- **D-09:** Use glass panels over dark map/dashboard surfaces: translucent panels, blur, thin borders, and subtle glow. Planners should explicitly preserve contrast/readability and avoid overusing blur where tables or dense numbers need clarity.

### Sparse Data, Confidence, and Freshness
- **D-10:** Claude has discretion for the remaining sparse-data display decisions. Default approach: show the compute index confidently as a trend signal, while making confidence/completeness visible in context instead of apologizing for every missing input.
- **D-11:** Encode confidence and completeness with compact badges and tooltips: confidence 1–5, `partial` vs `full`, freshness age, and source/factor availability should be visible on detail pages and summarized in map/detail rails.
- **D-12:** Sparse or partial entities should remain explorable and rankable unless the score is zero or unusable. The UI should visually de-emphasize low-confidence rows/markers rather than hiding them by default.
- **D-13:** Factor breakdowns should distinguish raw factor values, normalized factor scores, and weights so users can understand why an entity ranks highly without reading pipeline code.
- **D-14:** Risk tier and risk multiplier should be presented as modeling assumptions, not legal advice. Risk UI should be clear but not alarmist.

### Map, Rankings, and Charts Balance
- **D-15:** Claude has discretion for the remaining map/chart balance decisions. Default approach: initial screen is map-first, but always includes a lightweight ranking/detail rail so users can compare entities without leaving the map.
- **D-16:** Respect the roadmap's under-300KB initial bundle target by code-splitting heavier visualization surfaces. Load MapLibre for the primary map experience; lazy-load ECharts-heavy trend/detail panels when selected or routed to.
- **D-17:** Rankings should be available for countries, cities, and cloud regions as first-class views/panels sorted by index score, with confidence and score change/freshness indicators where data exists.
- **D-18:** Trend charts should prioritize selected entity detail pages and drill-down panels over the initial map shell. The first screen should not block on chart bundles or historical data if the map/ranking shell can render first.
- **D-19:** Phase 3 should implement the 2D MapLibre choropleth and drill-down interactions only. Do not sneak in the deferred 3D globe or time-lapse animation.

### Claude's Discretion
- **D-20:** The user explicitly delegated all remaining Phase 3 decisions after selecting the core exploration and visual direction. Claude may choose component decomposition, state store shape, query keys, route names, loading states, map style source, chart option details, and responsive breakpoints as long as the decisions above and roadmap success criteria are met.
- **D-21:** If a choice conflicts with the project core value, prefer predictive trend exploration over absolute-number precision or exhaustive explanation.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project and Roadmap
- `.planning/PROJECT.md` — Project vision, pure frontend/GitHub Pages constraints, active requirements, UI aesthetic, data-source philosophy
- `.planning/ROADMAP.md` — Phase 3 success criteria, scope boundary, HashRouter and bundle-size constraints
- `.planning/STATE.md` — Current phase position and deferred v2 items, including 3D globe and time-lapse animation

### Prior Phase Decisions
- `.planning/phases/01-pipeline-skeleton/01-CONTEXT.md` — Static data output contract decisions for `latest.json`, `rankings.json`, `history.json`, and per-entity JSON files
- `.planning/phases/02-data-sources-index-model/02-CONTEXT.md` — Composite index, confidence, risk, factor breakdown, and entity hierarchy decisions that the frontend must represent

### Existing Data Contracts and Pipeline Code
- `scripts/types.ts` — TypeScript interfaces for `CompiledEntity`, `EntityFile`, entity types, confidence, risk, factor breakdown, and static JSON contracts
- `scripts/compiler.ts` — Generates `latest.json`, `rankings.json`, and `history.json`; defines current aggregate output shape consumed by frontend queries
- `scripts/index-model.ts` — Defines factor computation, normalization, confidence, completeness, aggregation, and risk behavior that UI explanations must reflect
- `public/data/index-config.json` — Factor weights and confidence penalty configuration shown in breakdown/detail UI
- `scripts/mappings/entity-crossref.json` — Entity hierarchy and company/country/city/cloud-region mappings used for drill-down and overlays

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `public/data/index-config.json` — Use to render factor labels, weights, and index methodology snippets in details/breakdowns
- `scripts/types.ts` — Source of truth for frontend TypeScript data shapes; planners should either import shared types where viable or mirror generated frontend types carefully
- `scripts/mappings/entity-crossref.json` — Provides country/city/cloud-region/company relationships for drill-down navigation and overlay grouping

### Established Patterns
- Project is currently pipeline-only; Phase 3 introduces the first React/Vite frontend source tree.
- Existing package uses ESM, TypeScript, Vitest, and Node 20.19.0.
- Data is static JSON under `public/data/`; frontend should fetch via paths compatible with Vite base URL and GitHub Pages.
- Entity types are `country`, `city`, `cloud-region`, and `company`; hierarchy is country → city → cloud-region, while company is standalone.

### Integration Points
- Add React/Vite frontend entry points and HashRouter without breaking existing `npm test` and `npm run pipeline` scripts.
- Fetch `latest.json`, `rankings.json`, `history.json`, `index-config.json`, and entity/crossref data as static assets.
- MapLibre heatmap depends on country geometry; if no boundary asset exists yet, planners must add or generate a GitHub Pages-friendly static GeoJSON/TopoJSON asset within bundle/file-size constraints.
- ECharts trend panels consume `history.json`; lazy-load chart code to protect initial bundle budget.

</code_context>

<specifics>
## Specific Ideas

- User chose map-first entry, zoom-first country interaction, hybrid map-layer plus breadcrumb/detail rail drill-down, company overlay layer, minimal dark style, cyan/green accents, mono-heavy typography, and glass panels.
- User then said the remaining decisions are delegated to Claude (`后面决策都交给你了`, `相信自己`, `必将胜利`). Treat unspecified implementation details as Claude discretion rather than unresolved questions.

</specifics>

<deferred>
## Deferred Ideas

- 3D globe view remains v2 and should not be included in Phase 3.
- Time-lapse animation remains v2 and should not be included in Phase 3.
- Methodology page, data export, and embeddable widgets remain deferred v2 items.

</deferred>

---

*Phase: 3-Frontend Visualization*
*Context gathered: 2026-05-07*
