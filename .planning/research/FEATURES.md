# Feature Landscape

**Domain:** Global AI compute index and heatmap platform ("Bloomberg of AI compute")
**Researched:** 2026-05-06
**Overall confidence:** MEDIUM (synthesized from reference platform analysis; no direct competitor exists)

## Reference Platforms Studied

| Platform | Domain | Key Takeaway |
|----------|--------|--------------|
| Bloomberg Terminal | Financial index/HUD | Gold standard for terminal-style data density, index composition transparency, multi-pane layouts |
| TradingView | Market heatmaps | Heatmap + screener + multi-timeframe analysis pattern widely adopted |
| Our World in Data | Open data visualization | Source attribution per chart, methodology research pages, 13K+ interactive charts, open source |
| Electricity Maps | Energy grid data | Real-time map + historical + forecast, methodology page, API product, open source model |
| Climate TRACE | Emissions tracking | Asset-level data on map, open data portal, multi-source methodology, sector decomposition |
| Fragile States Index | Composite index | 12 indicators in 4 categories, heat map, country profiles, comparative analysis, Excel download |
| CKAN | Open data platform | REST API design (Action API v3), rich metadata, Solr search, activity streams |
| Kepler.gl / Deck.gl | Geospatial viz | Heatmap layers, time range filters, split map view, 3D building layers, split-screen comparison |

## Table Stakes

Features users expect from a data index platform. Missing any of these and the platform feels incomplete or untrustworthy.

### 1. Interactive Heatmap / Map View

**Why expected:** The "heatmap" is literally in the product name. Every geospatial data platform (Electricity Maps, Climate TRACE, FSI) centers on a map view.

| Aspect | Requirement | Notes |
|--------|-------------|-------|
| 2D map | Choropleth world map colored by compute index score | Country-level at minimum |
| 3D globe | Globe view with data overlays | PROJECT.md lists as Active requirement |
| Color scale | Continuous gradient (e.g., blue-to-red or intensity scale) | Must be colorblind-accessible |
| Hover tooltips | Country/city name + key metrics on hover | Standard expectation |
| Click-through | Click region to drill down | Enters detail view |

**Complexity:** Medium. MapLibre GL + deck.gl handle rendering. Data binding is the work.
**Confidence:** HIGH -- every reference platform has this.

### 2. Multi-Level Drill-Down (Country to Data Center)

**Why expected:** PROJECT.md specifies this hierarchy: country -> city -> cloud region -> company -> data center cluster. Reference platforms like Climate TRACE (global -> sector -> asset) and FSI (global -> country -> indicator) follow similar patterns.

| Level | View | Data Shown |
|-------|------|------------|
| Global | Heatmap + top-N rankings | Aggregate index scores |
| Country | Country profile page | Index composition, trends, comparisons |
| City | City detail within country | Local data center clusters, providers |
| Cloud Region | Region detail (e.g., us-east-1) | Pricing, availability, capacity signals |
| Company | Provider detail | CapEx trends, infrastructure footprint |
| Cluster | Specific data center cluster | Individual facility signals |

**Complexity:** High. Requires hierarchical data model and route structure for 5+ drill levels.
**Confidence:** HIGH -- standard pattern, but the 5-level depth is unusually deep.

### 3. Top-N Rankings Tables

**Why expected:** Bloomberg, TradingView, FSI all show ranked lists. Users expect to see "Top 10 countries by AI compute capacity" at a glance.

| Aspect | Requirement | Notes |
|--------|-------------|-------|
| Country ranking | Sortable table by index score | MVP: 10 countries |
| City ranking | Sortable table by city-level score | MVP: 20 cities |
| Cloud region ranking | Sortable by pricing/capacity signals | MVP: 5 providers |
| Delta indicators | Show change from previous period | Up/down arrows, color coding |
| Filtering | Filter by region, provider | Nice-to-have for v1 |

**Complexity:** Low-Medium. Mostly data presentation.
**Confidence:** HIGH -- universal pattern.

### 4. Historical Trend Charts

**Why expected:** Core value prop is "predictive trend signals." Without time-series charts, trends are invisible. OWID, TradingView, FSI all center on historical data.

| Aspect | Requirement | Notes |
|--------|-------------|-------|
| Line charts | Index score over time per entity | At minimum for top-10 countries |
| Time range selector | 1M / 3M / 6M / 1Y / All | Standard TradingView pattern |
| Multi-entity overlay | Compare 2+ countries on same chart | See Differentiators for full comparison mode |
| Area charts | Stacked area for index composition | Shows what contributes to score |

**Complexity:** Medium. Charting library (e.g., ECharts, D3) plus time-series data model.
**Confidence:** HIGH -- required for "trend signals" value prop.

### 5. Index Methodology Page

**Why expected:** Every credible index platform documents methodology. FSI has dedicated methodology page. Climate TRACE documents multi-source approach. OWID publishes methodology research articles. Without this, the index is a black box and loses credibility.

| Aspect | Requirement | Notes |
|--------|-------------|-------|
| Index formula | How composite score is calculated | Weights, normalization, aggregation |
| Data sources list | Every source with reliability tier | Maps to 4-layer data architecture |
| Update frequency | When each source updates | "4x daily" for some, quarterly for others |
| Limitations section | What the index cannot measure | GPU shipment data gaps, CapEx proxy caveats |
| Versioning | Methodology changelog | When formula changes, document why |

**Complexity:** Low (content), Medium (if building dynamic methodology pages from data config).
**Confidence:** HIGH -- non-negotiable for credibility.

### 6. Data Source Attribution

**Why expected:** OWID attributes every chart to its source. Climate TRACE names data sources per sector. Without attribution, users cannot assess reliability.

| Aspect | Requirement | Notes |
|--------|-------------|-------|
| Per-chart source label | "Source: AWS Pricing API, SEC EDGAR" | Visible on every visualization |
| Confidence score display | 1-5 scale per data point | PROJECT.md specifies this |
| Last updated timestamp | "Last updated: 2026-05-06 12:00 UTC" | Per data point or per section |
| Source tier indicator | L1 (structured API) through L4 (manual) | Maps to 4-layer architecture |

**Complexity:** Low. Metadata must flow through data pipeline to UI.
**Confidence:** HIGH -- standard practice.

### 7. Detail Pages (Entity Profiles)

**Why expected:** FSI country dashboards, Bloomberg company pages, TradingView instrument pages. Every entity (country, city, company) needs a dedicated detail view.

| Aspect | Requirement | Notes |
|--------|-------------|-------|
| Index composition breakdown | What factors contribute to this entity's score | Pie/stacked bar chart |
| Data sources used | Which sources fed this entity's data | With confidence levels |
| Risk analysis | Export control risk, geopolitical factors | PROJECT.md lists this |
| Historical trend | Entity-specific time series | See Historical Trend Charts |
| Related entities | "Similar countries" or "Same-region peers" | Nice-to-have for v1 |

**Complexity:** Medium-High. One template, many data sources per entity.
**Confidence:** HIGH -- standard pattern.

### 8. Data Export

**Why expected:** FSI offers Excel download. CKAN supports file uploads/downloads. Bloomberg has extensive Excel integration. Analysts want to work with raw data.

| Format | Priority | Notes |
|--------|----------|-------|
| CSV | v1 | Minimum viable export |
| JSON | v1 | Already exists as static files; expose direct links |
| Excel (.xlsx) | v2 | Nice-to-have; can generate in GitHub Actions |

**Complexity:** Low. Static JSON files already exist; CSV/JSON export is trivial for a static site.
**Confidence:** HIGH -- universal expectation.

### 9. Responsive Data Pipeline Indicators

**Why expected:** Electricity Maps shows system status. OWID shows data freshness. Users need to know "is this data stale?"

| Aspect | Requirement | Notes |
|--------|-------------|-------|
| Global data freshness badge | "Data current as of X hours ago" | On homepage |
| Per-source freshness | Individual source last-updated time | On methodology/data page |
| Pipeline status | "Last successful run: X" | Health indicator for automation |

**Complexity:** Low. GitHub Actions already generates timestamps.
**Confidence:** MEDIUM -- not every platform does this explicitly, but it builds trust.

## Differentiators

Features that set ComputeAtlas apart. These create competitive advantage and justify the "Bloomberg of AI compute" positioning.

### 1. Confidence Scoring Visualization

**Value proposition:** No other compute/data platform quantifies and visualizes data reliability per data point. This is the "Bloomberg-quality" differentiator -- making uncertainty visible rather than hiding it.

| Aspect | Design | Notes |
|--------|--------|-------|
| Per-metric confidence | 1-5 scale, visually distinct (opacity, border, icon) | Based on source reliability tier |
| Aggregate confidence | Country-level confidence as weighted average | Users see "this score is high-confidence" vs "this is estimated" |
| Confidence filter | "Show only high-confidence data" | Power users filter by reliability |
| Confidence legend | Explains what each level means | On methodology page |

**Complexity:** Medium. Requires confidence metadata pipeline + visual treatment.
**Dependencies:** Data source attribution, methodology page.
**Confidence:** HIGH that this is differentiating -- no competitor does this.

### 2. Time-Lapse / Temporal Animation

**Value proposition:** Animated playback of compute capacity evolution makes trends visceral. Climate TRACE and energy platforms use this for storytelling.

| Aspect | Design | Notes |
|--------|--------|-------|
| Play/pause controls | Standard media controls for temporal scrubbing | |
| Speed control | 1x / 2x / 4x playback | |
| Date slider | Scrub to any point in time | Kepler.gl pattern |
| Trail effect | Show previous positions fading | Enhances perception of movement |
| Auto-highlight | Pulse regions with largest change | Draws attention to hotspots |

**Complexity:** Medium-High. Requires time-indexed data + animation framework.
**Dependencies:** Historical data at sufficient granularity (at least monthly snapshots).
**Confidence:** HIGH that this is differentiating -- powerful storytelling tool.

### 3. Side-by-Side Comparison Mode

**Value proposition:** Bloomberg's PORT and TradingView's multi-chart layouts let users compare entities. FSI has explicit comparative analysis. No AI compute platform offers this.

| Aspect | Design | Notes |
|--------|--------|-------|
| Split view | 2 panels, each showing a country/city/entity | TradingView split-map pattern |
| Synchronized time axis | Both panels share same time range | Critical for fair comparison |
| Metric alignment | Same metrics shown for both entities | Prevents apples-to-oranges |
| Difference highlight | Show delta between entities | Color-coded divergence |

**Complexity:** Medium. Dual-panel layout + synchronized state management.
**Dependencies:** Historical trend charts, entity detail pages.
**Confidence:** HIGH -- strong differentiator with clear UX precedent.

### 4. Composite Index Customization (Build Your Own Index)

**Value proposition:** Bloomberg allows custom index creation. Letting users adjust weights and factors transforms ComputeAtlas from a dashboard into an analysis tool.

| Aspect | Design | Notes |
|--------|--------|-------|
| Weight sliders | Adjust importance of energy, CapEx, pricing factors | |
| Factor toggle | Include/exclude specific data sources | |
| Custom index export | Download user-configured index results | |
| Preset indices | "Energy-focused" vs "CapEx-focused" vs "Balanced" | Quick-start templates |

**Complexity:** High. Requires client-side index computation + UI for configuration.
**Dependencies:** Index methodology must be fully parameterized.
**Confidence:** MEDIUM -- ambitious for v1, but powerful long-term differentiator.

### 5. Embeddable Widgets / Chart Embeds

**Value proposition:** OWID charts are embeddable on external sites. This drives adoption and backlinks. Essential for an open-source platform seeking influence.

| Aspect | Design | Notes |
|--------|--------|-------|
| Embed code | iframe or Web Component snippet | Per chart/map |
| Embed customization | Size, theme (dark/light), selected metrics | |
| Auto-update | Embedded widgets reflect latest data | Static JSON serves this naturally |

**Complexity:** Low-Medium. Mostly URL parameter handling + responsive sizing.
**Dependencies:** Stable chart components, public hosting.
**Confidence:** HIGH -- standard open-source data platform feature.

### 6. Country / City Profile Pages with "Compute Report" Format

**Value proposition:** Like Bloomberg company research reports or Climate TRACE country profiles. Generate a structured "AI Compute Report" per entity that reads like a briefing document.

| Section | Content | Notes |
|---------|---------|-------|
| Score summary | Current index score, rank, trend | Hero section |
| Key metrics | GPU pricing, energy capacity, CapEx | Dashboard grid |
| Risk factors | Export controls, energy constraints, policy | Analysis section |
| Trend forecast | Based on recent trajectory | Forward-looking signal |
| Peer comparison | How entity compares to regional peers | Quick benchmark |

**Complexity:** Medium. Template-driven content generation from data.
**Dependencies:** Entity detail pages, historical data, risk data.
**Confidence:** MEDIUM -- ambitious but highly valuable for positioning.

### 7. Global Compute Capacity Clock / Ticker

**Value proposition:** A single hero number on the homepage that captures total estimated global AI compute capacity, updating regularly. Like the "World Population Clock" or "Global Debt Clock" -- an instantly shareable, attention-grabbing metric.

| Aspect | Design | Notes |
|--------|--------|-------|
| Hero number | "Estimated global AI compute: X EFLOPS" | Animated counter |
| Breakdown | Hover/tap to see: by cloud / by region / by company | Mini-donut chart |
| Trend indicator | Arrow showing direction | "Up X% from last month" |

**Complexity:** Low. Single computed value with animated display.
**Dependencies:** Index computation must produce a global aggregate.
**Confidence:** HIGH -- powerful attention tool, simple to build.

## Anti-Features

Features to deliberately NOT build. These are either architecturally impossible given constraints, premature optimization, or scope creep traps.

### 1. Real-Time Data Streaming

**Why avoid:** PROJECT.md explicitly states "daily snapshots (4x/day) are sufficient for trend analysis." Real-time requires a backend server, WebSocket infrastructure, and continuous compute -- all violating the pure-frontend + GitHub Actions constraint.

**What to do instead:** Show clear timestamps. Use "Data as of X" messaging. If users want freshness, 4x daily is already frequent for trend analysis.

### 2. Mobile-First Design

**Why avoid:** PROJECT.md states "desktop Bloomberg-style experience is primary." Bloomberg Terminal is desktop-only for good reason -- dense data displays do not compress to mobile screens.

**What to do instead:** Make it viewable on mobile (responsive), but do not optimize for mobile-first interaction patterns. No hamburger-menu-hidden-everything. If on mobile, show a simplified "latest snapshot" view at most.

### 3. User Accounts / Authentication

**Why avoid:** Static site architecture cannot support user sessions without a backend. User accounts invite a feature snowball (profiles, saved preferences, sharing, permissions).

**What to do instead:** All data is public. Customization (index weights, watchlists) stored in localStorage or URL parameters. Share via URL state encoding.

### 4. Social / Community Features

**Why avoid:** TradingView's social features (ideas, comments, user scripts) are a massive engineering surface. They require moderation, anti-spam, notification systems. This is a data platform, not a social network.

**What to do instead:** Open-source contribution model (GitHub Issues, PRs). Link to a Discord or GitHub Discussions for community, but do not build it into the platform.

### 5. Absolute Precision Metrics

**Why avoid:** PROJECT.md states "Accuracy of absolute numbers is secondary to the predictive value of trends." Chasing exact GPU counts or market share numbers means competing with paid research firms (Gartner, IDC) who have proprietary data.

**What to do instead:** Always show ranges and confidence intervals. Use "estimated" language. Make the methodology transparent so users understand the proxy nature of the data.

### 6. Trading / Transaction Capabilities

**Why avoid:** Bloomberg Terminal includes trading execution. This is an index/analysis platform, not a marketplace. Adding commerce (even "compute futures" hypothetically) vastly increases scope, legal requirements, and liability.

**What to do instead:** Stick to analysis and intelligence. If market mechanisms emerge for AI compute trading, link to them -- do not build them.

### 7. News Aggregation / CMS

**Why avoid:** PROJECT.md positions the platform as "not a news aggregator." Building a CMS for articles, editorial content, or news feeds is a different product.

**What to do instead:** Focus on data-driven insights. The "analysis" in detail pages is generated from data, not editorial content. Link to external news sources where relevant, but do not curate news.

### 8. Multi-Language Support (i18n)

**Why avoid for v1:** i18n adds UI complexity, translation maintenance burden, and RTL layout concerns. The primary audience (AI infrastructure analysts, cloud architects) operates in English.

**What to do instead:** English-only for v1. Use clear, simple English. If adoption grows internationally, add i18n as a phase 2+ feature. Structure code to be i18n-ready (string externalization) without implementing it.

### 9. Advanced Data Transformation / ETL UI

**Why avoid:** GitHub Actions already handles the data pipeline. Building a visual ETL editor or data transformation UI in the frontend duplicates infrastructure that already works.

**What to do instead:** The data pipeline is code (TypeScript/Python scripts in GitHub Actions). Contributors modify pipeline via PRs, not a UI. Document the pipeline clearly.

### 10. GPU-Level Benchmark Data

**Why avoid:** Actual GPU benchmark data (MLPerf, training throughput) requires running benchmarks or licensing results. This is a different product (hardware benchmarking vs. capacity tracking).

**What to do instead:** Use pricing and CapEx as proxies for capacity. If benchmark data becomes available as open data, integrate it as a new data source layer.

## Feature Dependencies

```
Interactive Heatmap
  ├── Multi-Level Drill-Down (requires hierarchical data model)
  │     ├── Detail Pages / Entity Profiles
  │     │     ├── Index Composition Breakdown
  │     │     ├── Risk Analysis
  │     │     └── Peer Comparison (nice-to-have)
  │     └── Top-N Rankings (shares data model)
  └── Time-Lapse Animation (requires time-indexed data)
        └── Side-by-Side Comparison (requires synchronized time axis)

Index Methodology Page
  ├── Data Source Attribution (feeds methodology display)
  ├── Confidence Scoring Visualization (extends attribution)
  └── Global Compute Clock (consumes aggregated index)

Historical Trend Charts
  ├── Time-Lapse Animation (animates trend data)
  ├── Side-by-Side Comparison (syncs trend views)
  └── Country Profile "Reports" (uses trend data in narratives)

Data Export
  └── (standalone, no upstream dependencies)

Embeddable Widgets
  └── (depends on stable chart components)

Custom Index Builder
  └── Index Methodology (must be fully parameterized first)
```

## MVP Recommendation

### Prioritize (Phase 1: Core Platform)

1. **Interactive Heatmap** (2D map) -- the hero feature, the name of the product
2. **Top-N Rankings** -- immediate value, low complexity
3. **Historical Trend Charts** -- validates the "trend signals" value prop
4. **Index Methodology Page** -- establishes credibility from day one
5. **Data Source Attribution + Confidence Scores** -- differentiating and trust-building
6. **Detail Pages** (country level) -- minimum viable drill-down

### Include in Phase 2 (Deepen Analysis)

7. **Multi-level drill-down** (city, region, company, cluster) -- extend drill hierarchy
8. **3D Globe View** -- visual wow factor, but 2D map delivers the same data
9. **Data Export** (CSV/JSON) -- easy win once data model stabilizes
10. **Global Compute Clock** -- attention-grabbing hero number
11. **Data Pipeline Status Indicators** -- trust signals

### Defer to Phase 3+ (Differentiate)

12. **Time-Lapse Animation** -- powerful but needs temporal data depth
13. **Side-by-Side Comparison** -- needs synchronized multi-entity views
14. **Custom Index Builder** -- advanced, requires parameterized index
15. **Embeddable Widgets** -- adoption driver, but not core value
16. **Country "Compute Reports"** -- narrative layer, needs mature data

### Reasoning

The MVP must answer one question: "What does the global AI compute landscape look like right now, and where is it heading?" This requires a map (where), rankings (who), trends (where heading), and methodology (why should I trust this). Everything else layers on top of that foundation.

## Sources

| Source | Type | Confidence |
|--------|------|------------|
| Bloomberg Terminal feature set | Training knowledge (financial platform) | MEDIUM |
| TradingView heatmap patterns | Training knowledge + web research | MEDIUM |
| Our World in Data (ourworldindata.org) | Web fetch, live platform | HIGH |
| OWID Grapher (github.com/owid/owid-grapher) | Web fetch, GitHub repo | HIGH |
| Electricity Maps (electricitymaps.com) | Web fetch, live platform | HIGH |
| Climate TRACE (climatetrace.org) | Web fetch, live platform | HIGH |
| Fragile States Index (fragilestatesindex.org) | Web fetch, live platform | HIGH |
| CKAN API docs (docs.ckan.org) | Web fetch, official docs | HIGH |
| Kepler.gl (github.com/keplergl/kepler.gl) | Web fetch, GitHub repo | HIGH |
| Geospatial platform patterns (Mapbox, Deck.gl, ArcGIS) | Training knowledge | LOW |
| DCIM / data center monitoring platforms | Training knowledge | LOW |

---
*Last updated: 2026-05-06*
