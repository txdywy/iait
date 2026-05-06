# Roadmap: ComputeAtlas

## Overview

ComputeAtlas delivers a pure-frontend AI compute index platform in four phases. Phase 1 validates the full pipeline end-to-end with one data source (AWS GPU pricing). Phase 2 completes all data sources and builds the composite index model. Phase 3 creates the Bloomberg-style frontend with heatmap, rankings, trends, and detail pages. Phase 4 automates the pipeline via GitHub Actions for continuous deployment.

## Phases

- [ ] **Phase 1: Pipeline Skeleton** - End-to-end data pipeline with AWS pricing, scraper registry, normalized storage, and data compiler
- [ ] **Phase 2: Data Sources + Index Model** - All remaining scrapers (Azure, OWID, World Bank, SEC EDGAR) plus composite compute index with configurable scoring
- [ ] **Phase 3: Frontend Visualization** - MapLibre heatmap, drill-down navigation, rankings, trend charts, detail pages, and Bloomberg-style HUD theme
- [ ] **Phase 4: Automation + Deployment** - GitHub Actions 4x/day pipeline, deployment, data versioning, and resilience

## Phase Details

### Phase 1: Pipeline Skeleton
**Goal**: Validated end-to-end pipeline from data fetch through normalized storage to compiled output
**Depends on**: Nothing (first phase)
**Requirements**: PIPE-01, PIPE-06, PIPE-07, PIPE-08, PIPE-09, PIPE-10, INF-03
**Success Criteria** (what must be TRUE):
  1. Running the pipeline fetches AWS GPU pricing data and produces normalized JSON files in `public/data/entities/`
  2. Data compiler produces `latest.json`, `rankings.json`, and `history.json` from normalized entity data
  3. Adding a new data source requires only implementing the scraper interface and registering it -- no core pipeline changes needed
  4. Incremental runs skip entities whose source data has not changed since the last run
  5. Fetch library retries on failure (3 retries, exponential backoff) and respects rate limits
**Plans**: 4 plans in 3 waves

Plans:
**Wave 1**
- [x] 01-01-PLAN.md -- Project scaffold, types, and test infrastructure (Wave 1)
- [x] 01-02-PLAN.md -- Shared utilities: hash, fetch-with-retry, registry (Wave 1)

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 01-03-PLAN.md -- AWS GPU pricing scraper with Signature V4 (Wave 2)

**Wave 3** *(blocked on Wave 2 completion)*
- [x] 01-04-PLAN.md -- Data compiler and pipeline orchestration (Wave 3)

### Phase 2: Data Sources + Index Model
**Goal**: Complete compute index covering all data sources with configurable scoring, confidence levels, and risk adjustment
**Depends on**: Phase 1
**Requirements**: PIPE-02, PIPE-03, PIPE-04, PIPE-05, INDX-01, INDX-02, INDX-03, INDX-04, INDX-05, INDX-06, INDX-07
**Success Criteria** (what must be TRUE):
  1. Pipeline scrapes Azure GPU pricing, OWID energy data, World Bank energy indicators, and SEC EDGAR CapEx for 5 companies
  2. Composite index formula combines GPU_Supply, Energy_Capacity, Cloud_Region_Density, AI_CapEx, and Risk_Adjustment into a single score
  3. Each factor is normalized to 0-100 via percentile ranking, with weights configurable in a JSON config file
  4. Every data point carries a confidence score (1-5) based on source reliability, and the index degrades gracefully under sparse data
  5. Export control risk adjustment applies country-tier lookup table to index scores; MVP covers 10 countries, 20 cities, 5 cloud providers
**Plans**: 4 plans in 3 waves

Plans:
**Wave 1**
- [x] 02-01-PLAN.md -- Bug fixes (CR-01/CR-02), types extension, and config files

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 02-02-PLAN.md -- Azure GPU pricing scraper
- [x] 02-03-PLAN.md -- OWID energy, World Bank energy, and SEC EDGAR CapEx scrapers

**Wave 3** *(blocked on Wave 2 completion)*
- [x] 02-04-PLAN.md -- Composite index model, compiler upgrade, and pipeline integration

### Phase 3: Frontend Visualization
**Goal**: Users can explore the compute index through an interactive map, rankings, trends, and detail pages with a Bloomberg Terminal aesthetic
**Depends on**: Phase 2
**Requirements**: FE-01, FE-02, FE-03, FE-04, FE-05, FE-06, FE-07, FE-08, FE-09
**Success Criteria** (what must be TRUE):
  1. User sees a 2D global heatmap (MapLibre GL JS) with country-level compute index as a choropleth layer
  2. User can drill down: country -> city -> cloud region -> company -> data center cluster
  3. User can view Top-N rankings tables for countries, cities, and cloud regions sorted by index score
  4. User can view historical trend charts (ECharts) for any entity
  5. Entity detail pages show index factor breakdown, contributing data sources, confidence score, risk analysis, and data freshness indicators
  6. App uses HashRouter for GitHub Pages compatibility, dark Bloomberg HUD theme (Tailwind CSS 4), and code-split initial bundle under 300KB
**Plans**: TBD

Plans:
- [ ] 03-01: TBD
- [ ] 03-02: TBD
- [ ] 03-03: TBD
**UI hint**: yes

### Phase 4: Automation + Deployment
**Goal**: Pipeline runs automatically 4x/day, deploys on push, and serves last valid data when pipeline fails
**Depends on**: Phase 3
**Requirements**: INF-01, INF-02, INF-04, INF-05, INF-06
**Success Criteria** (what must be TRUE):
  1. GitHub Actions workflow triggers at UTC 0/6/12/18 and runs the full data pipeline
  2. Successful pipeline commits trigger automatic deployment to GitHub Pages
  3. When the pipeline fails, the site continues serving the last valid dataset without interruption
  4. Each run commits a dated snapshot for versioning and rollback
  5. Pipeline completes within 15 minutes per run
**Plans**: TBD

Plans:
- [ ] 04-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Pipeline Skeleton | 4/4 | Complete | - |
| 2. Data Sources + Index Model | 0/4 | Planning complete | - |
| 3. Frontend Visualization | 0/3 | Not started | - |
| 4. Automation + Deployment | 0/1 | Not started | - |
