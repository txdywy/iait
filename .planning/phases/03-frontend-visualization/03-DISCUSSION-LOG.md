# Phase 3: Frontend Visualization - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-07
**Phase:** 3-Frontend Visualization
**Areas discussed:** Exploration flow, HUD visual style, Sparse data display, Map/chart balance

---

## Exploration Flow

### Primary entry point

| Option | Description | Selected |
|--------|-------------|----------|
| Map-first | Open on the global choropleth heatmap, with rankings and detail panels supporting map exploration. | ✓ |
| Dashboard-first | Open on KPI cards, Top-N rankings, and trends first, with the map as one major panel. | |
| Split-screen | Map and rankings share the first screen equally; denser but more Bloomberg-terminal-like. | |
| You decide | Let Claude choose the flow that best fits the roadmap and bundle constraints. | |

**User's choice:** Map-first
**Notes:** Establishes map exploration as the product's primary mental model.

### Country click behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Side panel | Keep the map visible and open a country intelligence panel with score, factors, rankings, and drill-down links. | |
| Detail page | Navigate immediately to a full country detail route; clearer deep analysis but breaks the map exploration flow. | |
| Zoom drilldown | Zoom the map into the country/city region first; visual and immersive but harder without detailed geospatial city data. | ✓ |
| You decide | Let Claude choose the interaction that best supports Phase 3 scope. | |

**User's choice:** Zoom drilldown
**Notes:** Drill-down should feel spatial before it becomes informational.

### Deeper drill-down representation

| Option | Description | Selected |
|--------|-------------|----------|
| Map layers | Switch layers as the user descends — country fill, then city markers, then cloud-region markers. | |
| Breadcrumb list | Use a visible hierarchy panel where each level is selected from lists; easier with static data but less map-native. | |
| Hybrid | Map layers plus a compact breadcrumb/detail rail; more work but balances spatial exploration and discoverability. | ✓ |
| You decide | Let Claude pick the safest scoped approach. | |

**User's choice:** Hybrid
**Notes:** Map layers and route/detail state should cooperate.

### Company entity placement

| Option | Description | Selected |
|--------|-------------|----------|
| Separate tab | Company rankings/detail pages live in a Companies view, while geography drill-down stays country/city/cloud-region. | |
| Country-linked | Show companies under their headquarters country; intuitive but can imply compute capacity is geographically located there. | |
| Overlay layer | Show company markers/cards on the map; visually rich but less truthful unless company locations are carefully modeled. | ✓ |
| You decide | Let Claude choose the cleanest data-model-aligned representation. | |

**User's choice:** Overlay layer
**Notes:** Capture caveat: overlays represent corporate AI CapEx/compute influence, not physical facility geography unless future data supports that.

---

## HUD Visual Style

### Density

| Option | Description | Selected |
|--------|-------------|----------|
| High-density | Dense panels, compact typography, many metrics visible at once; strongest terminal feel but harder for casual users. | |
| Balanced HUD | Dark terminal styling with clear hierarchy, readable spacing, and dense detail only in side/detail panels. | |
| Minimal dark | Cleaner executive-dashboard look; more approachable but less visually noisy. | ✓ |
| You decide | Let Claude choose based on the project's Bloomberg-style requirement. | |

**User's choice:** Minimal dark
**Notes:** Bloomberg/HUD should be restrained rather than maximal.

### Accent palette

| Option | Description | Selected |
|--------|-------------|----------|
| Cyan/green | Classic terminal/HUD palette; familiar for infrastructure and maps. | ✓ |
| Cyan/amber | Cyan for capacity/positive signal, amber for risk/freshness warnings. | |
| Blue/violet | More modern AI-dashboard feel; less Bloomberg-like but polished. | |
| You decide | Let Claude define a coherent palette during UI planning. | |

**User's choice:** Cyan/green
**Notes:** Preserve ComputeAtlas identity through terminal-like accents.

### Typography

| Option | Description | Selected |
|--------|-------------|----------|
| Mono-heavy | Strong terminal feel: monospace for most UI, especially tables and metrics. | ✓ |
| Mixed fonts | Monospace for numbers/tables/labels, clean sans-serif for headings and explanatory text. | |
| Sans-heavy | Most readable and modern; use monospace only for metadata or IDs. | |
| You decide | Let Claude choose the typography balance. | |

**User's choice:** Mono-heavy
**Notes:** Typography should reinforce terminal-native feel.

### Panel treatment

| Option | Description | Selected |
|--------|-------------|----------|
| Glass panels | Translucent blurred panels with thin borders; visually layered over the map. | ✓ |
| Solid panels | Mostly opaque dark panels with subtle cyan/green borders and restrained glow. | |
| Wireframe panels | Very thin lines, sparse fill, technical HUD feel. | |
| You decide | Let Claude pick the most readable implementation. | |

**User's choice:** Glass panels
**Notes:** Planning should preserve readability and contrast despite transparency/blur.

---

## Sparse Data Display

**User's choice:** Delegated to Claude.
**Notes:** Claude will decide details. Captured decision: show index as a confident trend signal while making confidence, completeness, stale data, factor availability, and risk modeling visible through compact badges/tooltips/detail pages rather than hiding partial data by default.

---

## Map/Chart Balance

**User's choice:** Delegated to Claude.
**Notes:** Claude will decide details. Captured decision: map-first initial shell, lightweight rankings/detail rail always available, ECharts trend/detail surfaces lazy-loaded to protect the under-300KB initial bundle goal.

---

## Claude's Discretion

- User explicitly delegated remaining decisions after the selected Exploration Flow and HUD Visual Style choices.
- Claude has discretion for sparse-data UI, map/chart bundle balance, component decomposition, route names, state management shape, query keys, loading states, chart options, and responsive breakpoints.

## Deferred Ideas

- 3D globe view remains deferred to v2.
- Time-lapse animation remains deferred to v2.
- Methodology page, data export, and embeddable widgets remain deferred v2 items.
