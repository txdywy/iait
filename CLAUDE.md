<!-- GSD:project-start source:PROJECT.md -->
## Project

**ComputeAtlas**

ComputeAtlas is an open-source "AI Compute Index & Heatmap Platform" that estimates, models, and visualizes global AI compute supply capacity across countries, cities, cloud regions, companies, and data center clusters. It positions itself not as a news aggregator but as an "AI-era compute economy index system" — analogous to PMI/VIX in finance or power load indices in energy. The platform uses a pure frontend architecture deployed to GitHub Pages, with all data processing handled by GitHub Actions generating static JSON files.

**Core Value:** Predictive trend signals for regional AI compute capacity — showing where compute supply is expanding, where it's plateauing, and where bottlenecks are emerging. Accuracy of absolute numbers is secondary to the predictive value of trends.

### Constraints

- **Architecture**: Pure frontend — no backend server, no database. All data as static JSON committed by GitHub Actions
- **Deployment**: GitHub Pages compatible. All routing must work with static file serving
- **LLM budget**: GitHub Models free tier only (150 GPT-4o-mini calls/day). Design extraction pipeline to batch efficiently
- **Data automation**: Every data source must be fetchable without paid API keys or human intervention (except manual curation layer)
- **Index philosophy**: Trend predictive value > strict verification accuracy. Accept inference and estimation where needed, but tag confidence levels
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Recommended Stack
### Core Framework
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| React | 19.2.x | UI framework | Explicit requirement; massive ecosystem, excellent TypeScript support |
| TypeScript | 5.x | Type safety | Essential for data-heavy platform with complex GeoJSON/JSON schemas |
| Vite | 8.x | Build tool | Fast HMR, native ESM, optimal tree-shaking for large chart/map libraries |
### 2D Map: MapLibre GL JS
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| maplibre-gl | 5.24.x | WebGL map renderer | Open-source (BSD-3), no API key required, native heatmap + choropleth + globe projection |
| react-map-gl | 8.1.x | React bindings for maps | Official vis.gl React wrapper; first-class MapLibre support via `react-map-gl/maplibre` import |
| Alternative | Rejection Reason |
|-------------|-----------------|
| Leaflet | No WebGL -- cannot handle heatmaps at scale, no 3D, raster-only basemaps |
| Mapbox GL JS | Requires paid API token; MapLibre is its open-source fork with identical API surface |
| deck.gl | Overkill for this use case; designed for millions-of-points data visualization; steeper learning curve, heavier bundle; better suited if we later need GPU-accelerated hex bin layers |
### 3D Globe: Globe.gl
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| globe.gl | 2.45.x | 3D globe engine | Built on Three.js; dedicated globe API with heatmap/arc/point/polygon layers out of the box |
| react-globe.gl | 2.37.x | React bindings | Direct React wrapper for globe.gl |
| Alternative | Rejection Reason |
|-------------|-----------------|
| Three.js (R3F) | Must build globe from scratch -- no built-in geospatial intelligence, lat/lng projection, or data layers. Days of work to replicate what globe.gl gives in 10 lines |
| CesiumJS | 5-10MB bundle, requires Cesium Ion token, enterprise-grade GIS tooling massively overkill for a data visualization globe |
| MapLibre globe mode | Already recommended as primary 2D view; Globe.gl provides a different visual treatment (dedicated 3D with atmosphere, arcs between locations, animated rings) for the "hero" landing view |
- Globe.gl: Landing page wow-factor, arc connections between data centers, 3D heat visualization
- MapLibre: Detailed drill-down exploration, country/city fill layers, marker clusters
### Charts: ECharts
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| echarts | 6.0.x | Charting library | Explicit requirement; rich chart types (line, bar, scatter, radar, treemap, sankey), built-in dark theme, excellent animation |
| echarts-for-react | 3.0.x | React wrapper | Official React component wrapper; theme registration via `echarts.registerTheme()` |
| Alternative | Rejection Reason |
|-------------|-----------------|
| Recharts | Limited chart types, no radar/sankey/treemap, weaker animation |
| D3.js | Too low-level for dashboard charts; ECharts provides same power with 10x less code |
| Plotly.js | Heavier bundle, less customizable styling for HUD aesthetic |
| Nivo | Beautiful but less chart variety and weaker time-series support |
### State Management
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| zustand | 5.0.x | Client state | Lightweight (1KB), no boilerplate, perfect for filter/view state (selected country, time range, view mode) |
| Alternative | Rejection Reason |
|-------------|-----------------|
| Redux Toolkit | Massive overkill for a read-heavy dashboard; 10x more boilerplate |
| Jotai | Atomic model harder to reason about for coordinated filter state |
| React Context | Re-renders too aggressively with frequently-changing filter state |
| MobX | Magic-based reactivity harder to debug; heavier |
### Data Fetching
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @tanstack/react-query | 5.100.x | Async state management | Caching, background refetch, stale-while-revalidate for static JSON; handles the "fetch JSON from public/ folder" pattern cleanly |
| Alternative | Rejection Reason |
|-------------|-----------------|
| SWR | Less powerful query invalidation, weaker devtools |
| Plain useEffect + fetch | No caching, no deduplication, no background refresh, error/loading state boilerplate |
| Axios | Not needed -- native fetch handles static JSON perfectly |
### CSS / Styling
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Tailwind CSS | 4.x | Utility-first CSS | Fast iteration on HUD layouts, built-in dark mode support, excellent for glassmorphism/translucent panels |
- `backdrop-filter: blur()` for frosted glass panels
- `box-shadow` with colored glow (`0 0 20px rgba(0, 255, 255, 0.3)`)
- Monospace fonts (JetBrains Mono or IBM Plex Mono)
- Thin border lines with `rgba()` opacity
- Dark background (#0a0a0f or similar deep navy/black)
- Cyan/green/amber accent colors (HUD convention)
### GeoJSON Data Utilities
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @types/geojson | 7946.x | TypeScript types for GeoJSON | Type safety for country boundaries, point data |
| topojson-client | 3.1.x | TopoJSON to GeoJSON conversion | Smaller file sizes for country boundary data (TopoJSON is ~80% smaller than GeoJSON) |
### Routing
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| react-router-dom | 7.15.x | Client-side routing | Standard React router; MUST use `createHashHistory` for GitHub Pages |
### Dev Dependencies
| Technology | Version | Purpose |
|------------|---------|---------|
| @vitejs/plugin-react | latest | Vite React integration |
| eslint + typescript-eslint | latest | Linting |
| prettier | latest | Code formatting |
| vitest | latest | Unit testing (native Vite integration) |
| @testing-library/react | latest | Component testing |
## Alternatives Considered
| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| 2D Map | MapLibre GL JS | Leaflet | No WebGL, no native heatmaps, raster-only |
| 2D Map | MapLibre GL JS | Mapbox GL JS | Requires paid API token |
| 2D Map | MapLibre GL JS | deck.gl | Overkill, steeper learning curve, designed for different use case |
| 3D Globe | Globe.gl | CesiumJS | 5-10MB bundle, requires Ion token, enterprise overkill |
| 3D Globe | Globe.gl | Three.js (R3F) | Must build everything from scratch |
| Charts | ECharts | Recharts | Limited chart types, no radar/sankey |
| State | Zustand | Redux Toolkit | Too heavy for read-only dashboard |
| Styling | Tailwind CSS | Ant Design / Mantine | Pre-built components fight the custom HUD aesthetic |
| Data fetch | React Query | SWR | Less powerful caching/invalidation |
## Installation
# Core
# Maps
# 3D Globe
# Charts
# State & Data
# Styling
# Geo data
# Dev dependencies
## Bundle Size Budget
| Component | Estimated Size | Notes |
|-----------|---------------|-------|
| React + ReactDOM | ~45KB gzipped | Core framework |
| MapLibre GL JS | ~200KB gzipped | WebGL map renderer |
| Globe.gl + Three.js | ~300KB gzipped | 3D globe (Three.js is dependency) |
| ECharts | ~200KB gzipped | Tree-shakeable; import only needed chart types |
| react-map-gl | ~20KB gzipped | Thin React wrapper |
| Tailwind CSS | ~15KB gzipped | Only used classes included |
| Other deps | ~30KB gzipped | Zustand, React Query, router |
| **Total** | **~810KB gzipped** | Acceptable for desktop-first data dashboard |
## GitHub Pages Deployment
### Vite Configuration
### Data Directory Structure
### GitHub Actions Deploy Workflow
# .github/workflows/deploy.yml
### Key Constraints
| Constraint | Impact | Mitigation |
|-----------|--------|------------|
| No server-side routing | All routes must be hash-based | Use `createHashHistory` in React Router |
| 1GB repo size limit | JSON data files can accumulate | Date-versioned cleanup in Actions; only keep last 30 days |
| 100MB per file limit | GeoJSON country boundaries can be large | Use TopoJSON (80% smaller); pre-simplify geometries |
| No dynamic endpoints | Cannot query a database | All data pre-computed as static JSON by Actions |
| Base path required | Asset URLs must include `/iait/` prefix | Use `import.meta.env.BASE_URL` for all asset paths |
## Sources
- MapLibre GL JS: https://github.com/maplibre/maplibre-gl-js (Context7 docs, v5.24.0 verified via npm)
- react-map-gl: https://github.com/visgl/react-map-gl (Context7 docs, v8.1.1 verified via npm)
- Globe.gl / React Globe.gl: https://github.com/vasturiano/globe.gl (Context7 docs, v2.45.3 verified via npm)
- ECharts: https://github.com/apache/echarts (Context7 docs, v6.0.0 verified via npm)
- echarts-for-react: https://github.com/hustcc/echarts-for-react (Context7 docs, v3.0.6 verified via npm)
- Vite GitHub Pages deployment: https://vitejs.dev/guide/static-deploy.html
- React Router v7: https://reactrouter.com (v7.15.0 verified via npm)
- Tailwind CSS v4: https://tailwindcss.com (v4.2.4 verified via npm)
- Zustand: https://github.com/pmndrs/zustand (v5.0.13 verified via npm)
- TanStack React Query: https://tanstack.com/query (v5.100.9 verified via npm)
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
