# Requirements: ComputeAtlas

**Defined:** 2026-05-06
**Core Value:** Predictive trend signals for regional AI compute capacity — where compute is expanding, plateauing, or facing bottlenecks.

## v1 Requirements

### Data Pipeline (PIPE)

- [ ] **PIPE-01**: AWS GPU pricing scraper fetches P5/G6/Inf2/Trn instance data with region, GPU model, GPU count, price/hr
- [ ] **PIPE-02**: Azure GPU pricing scraper fetches NC/HB series data with region, SKU, price/hr
- [ ] **PIPE-03**: OWID energy scraper fetches country-level electricity generation, nuclear share, renewable share
- [ ] **PIPE-04**: World Bank API scraper fetches energy indicators (nuclear, renewable, fossil share of electricity)
- [ ] **PIPE-05**: SEC EDGAR scraper fetches company CapEx data (PaymentsToAcquirePropertyPlantAndEquipment) for NVIDIA, AMD, Microsoft, Google, Amazon
- [ ] **PIPE-06**: Scraper interface + registry pattern allows adding new data sources without modifying core pipeline
- [ ] **PIPE-07**: All scrapers output normalized JSON with `{ source, entity, metric, value, unit, timestamp, confidence }` schema
- [ ] **PIPE-08**: Incremental updates — only recompute entities whose source data changed since last run
- [ ] **PIPE-09**: Per-entity time-series storage — one JSON file per entity in `public/data/entities/`
- [ ] **PIPE-10**: Data compiler produces `latest.json`, `rankings.json`, `history.json` from normalized data

### Index Model (INDX)

- [ ] **INDX-01**: Composite index formula: GPU_Supply + Energy_Capacity + Cloud_Region_Density + AI_CapEx - Risk_Adjustment
- [ ] **INDX-02**: Each factor normalized to 0-100 score using percentile ranking within the dataset
- [ ] **INDX-03**: Configurable factor weights in a JSON config file
- [ ] **INDX-04**: Confidence score (1-5) per data point based on source layer (Structured API=5, Manual=3)
- [ ] **INDX-05**: Index degrades gracefully — sparse data produces lower confidence, not missing index
- [ ] **INDX-06**: Export control risk adjustment uses a manually maintained country-tier lookup table
- [ ] **INDX-07**: Compute index for 10 countries, 20 cities, 5 cloud providers (MVP scope)

### Frontend (FE)

- [ ] **FE-01**: 2D global heatmap using MapLibre GL JS showing country-level compute index as choropleth
- [ ] **FE-02**: Drill-down from country → city → cloud region → company → data center cluster
- [ ] **FE-03**: Top-N rankings tables for countries, cities, and cloud regions sorted by index score
- [ ] **FE-04**: Historical trend charts (ECharts) for individual entities
- [ ] **FE-05**: Entity detail page showing index breakdown by factor, data sources, confidence score, risk analysis
- [ ] **FE-06**: Data freshness indicators — last-updated timestamp, source age for each data point
- [ ] **FE-07**: HashRouter routing compatible with GitHub Pages (no server-side redirects)
- [ ] **FE-08**: Bloomberg Terminal-style dark theme with HUD aesthetic (Tailwind CSS 4)
- [ ] **FE-09**: Code splitting — lazy load detail pages and charts to keep initial bundle under 300KB

### Infrastructure (INF)

- [ ] **INF-01**: GitHub Actions workflow runs data pipeline 4x/day (UTC 0/6/12/18)
- [ ] **INF-02**: GitHub Actions deploys to GitHub Pages on push to main
- [ ] **INF-03**: Scraper shared library with fetch-with-retry (3 retries, exponential backoff) and rate limiting
- [ ] **INF-04**: GitHub Actions pipeline completes within 15 minutes per run (budget: 1800 min/month)
- [ ] **INF-05**: Pipeline errors do not block deployment — last valid data is served until new data succeeds
- [ ] **INF-06**: Data versioning — each run commits dated snapshots to enable rollback

## v2 Requirements

### LLM Extraction Pipeline

- **LLM-01**: GitHub Models (GPT-4o-mini) batch extraction of earnings call AI CapEx mentions
- **LLM-02**: News RSS scraper with LLM structuring for data center announcements
- **LLM-03**: Policy/export control change detection via LLM diff on Federal Register
- **LLM-04**: OpenRouter free model fallback when GitHub Models quota exhausted
- **LLM-05**: Per-call confidence scoring with input hashing for reproducibility

### Advanced Visualization

- **VIZ-01**: 3D globe view (Globe.gl) for landing page hero with animated arcs between data centers
- **VIZ-02**: Time-lapse animation of compute capacity changes over time
- **VIZ-03**: Side-by-side comparison of two entities or regions
- **VIZ-04**: Global compute capacity clock (single headline number)

### Enrichment

- **ENRCH-01**: Methodology page explaining index formula, factor weights, data sources
- **ENRCH-02**: Data export (CSV/JSON) for any entity or ranking
- **ENRCH-03**: Embeddable widget snippets for external sites

## Out of Scope

| Feature | Reason |
|---------|--------|
| Traditional backend server | Pure frontend + GitHub Actions architecture; no server to maintain |
| Real-time data streaming | Daily snapshots sufficient for trend analysis; real-time adds massive complexity |
| Mobile-first design | Bloomberg-style HUD desktop experience is primary target |
| User accounts / authentication | Static site with no backend; no user state to manage |
| Social features | Data platform, not a community; no comments, shares, follows |
| Absolute precision in GPU shipments | Data is behind paywalls; CapEx proxy is sufficient for trend signals |
| i18n / multi-language | English-only for v1; index data is language-agnostic numbers |
| GPU benchmarks / performance data | Different scope (hardware reviews vs supply economics) |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PIPE-01 | Phase 1 | Pending |
| PIPE-02 | Phase 2 | Pending |
| PIPE-03 | Phase 2 | Pending |
| PIPE-04 | Phase 2 | Pending |
| PIPE-05 | Phase 2 | Pending |
| PIPE-06 | Phase 1 | Pending |
| PIPE-07 | Phase 1 | Pending |
| PIPE-08 | Phase 1 | Pending |
| PIPE-09 | Phase 1 | Pending |
| PIPE-10 | Phase 1 | Pending |
| INDX-01 | Phase 2 | Pending |
| INDX-02 | Phase 2 | Pending |
| INDX-03 | Phase 2 | Pending |
| INDX-04 | Phase 2 | Pending |
| INDX-05 | Phase 2 | Pending |
| INDX-06 | Phase 2 | Pending |
| INDX-07 | Phase 2 | Pending |
| FE-01 | Phase 3 | Pending |
| FE-02 | Phase 3 | Pending |
| FE-03 | Phase 3 | Pending |
| FE-04 | Phase 3 | Pending |
| FE-05 | Phase 3 | Pending |
| FE-06 | Phase 3 | Pending |
| FE-07 | Phase 3 | Pending |
| FE-08 | Phase 3 | Pending |
| FE-09 | Phase 3 | Pending |
| INF-01 | Phase 4 | Pending |
| INF-02 | Phase 4 | Pending |
| INF-03 | Phase 1 | Pending |
| INF-04 | Phase 4 | Pending |
| INF-05 | Phase 4 | Pending |
| INF-06 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 32 total
- Mapped to phases: 32
- Unmapped: 0

---
*Requirements defined: 2026-05-06*
*Last updated: 2026-05-06 after roadmap creation*
