# ComputeAtlas

## What This Is

ComputeAtlas is an open-source "AI Compute Index & Heatmap Platform" that estimates, models, and visualizes global AI compute supply capacity across countries, cities, cloud regions, companies, and data center clusters. It positions itself not as a news aggregator but as an "AI-era compute economy index system" — analogous to PMI/VIX in finance or power load indices in energy. The platform uses a pure frontend architecture deployed to GitHub Pages, with all data processing handled by GitHub Actions generating static JSON files.

## Core Value

Predictive trend signals for regional AI compute capacity — showing where compute supply is expanding, where it's plateauing, and where bottlenecks are emerging. Accuracy of absolute numbers is secondary to the predictive value of trends.

## Requirements

### Validated

- [x] GitHub Actions automation: 4x daily (UTC 0/6/12/18) data fetch, compute, deploy — Validated in Phase 04: automation-deployment (2026-05-08)

### Active

- [ ] Global AI compute heatmap with 2D map and 3D globe views
- [ ] Multi-level drill-down: country → city → cloud region → company → data center cluster
- [ ] AI Compute Index model built on four-layer data architecture (structured API / RSS+rules / LLM extraction / manual curation)
- [ ] Cloud GPU pricing scraper (AWS + Azure) as primary daily data source
- [ ] Energy/power data integration (OWID + World Bank API)
- [ ] Company AI CapEx tracking via SEC EDGAR XBRL
- [ ] GitHub Models (GPT-4o-mini) for NLP extraction of unstructured sources
- [ ] Top country / city / cloud region rankings with historical trends
- [ ] Confidence scoring per data point (1-5 scale based on source reliability)
- [ ] Bloomberg Terminal-inspired dark theme HUD UI
- [ ] Export control risk adjustment (manual lookup table, LLM change detection)
- [ ] Detail pages with index composition, data sources, risk analysis, trends

### Out of Scope

- Traditional backend server — all processing via GitHub Actions, all data as static JSON
- Absolute precision in GPU shipment/market share — these metrics are behind paywalls; we use CapEx proxies instead
- HBM/CoWoS supply chain data at launch — no public structured source exists; will use news-based LLM extraction later
- Real-time data — daily snapshots (4x/day) are sufficient for trend analysis
- Mobile-first design — desktop Bloomberg-style experience is primary

## Context

- **Data source reality (researched 2026-05-06):**
  - HIGH feasibility: Cloud GPU pricing APIs (AWS, Azure — free, JSON, daily), Energy data (OWID GitHub CSV + World Bank API — free, annual), Company CapEx (SEC EDGAR XBRL — free, quarterly)
  - MEDIUM feasibility: News/report extraction via GitHub Models LLM
  - LOW feasibility: GPU shipment volumes (paywalled), data center power capacity (no open DB), HBM supply (proprietary), export controls (text-based regulations)
- **GitHub Models constraints:** GPT-4o-mini: 150 requests/day, 8K in/4K out per call. Budget per daily run: ~37 calls. Strategy: batch news items into single calls (~9 calls/run target)
- **MVP scope:** 10 countries, 20 cities, 5 cloud providers, basic energy + data center index, heatmap + rankings + trends

## Constraints

- **Architecture**: Pure frontend — no backend server, no database. All data as static JSON committed by GitHub Actions
- **Deployment**: GitHub Pages compatible. All routing must work with static file serving
- **LLM budget**: GitHub Models free tier only (150 GPT-4o-mini calls/day). Design extraction pipeline to batch efficiently
- **Data automation**: Every data source must be fetchable without paid API keys or human intervention (except manual curation layer)
- **Index philosophy**: Trend predictive value > strict verification accuracy. Accept inference and estimation where needed, but tag confidence levels

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Predictive trends over verification accuracy | User prioritizes actionable trend signals over auditable numbers | - Pending |
| Four-layer data architecture | Structured APIs can't cover everything; LLM extraction fills gaps affordably | - Pending |
| GitHub Models for NLP | Zero-config in Actions, free tier sufficient with batching strategy | - Pending |
| CapEx as GPU supply proxy | Direct GPU shipment data is paywalled; company CapEx from SEC filings is free and correlated | - Pending |
| Pure frontend + GitHub Actions | No infra cost, no backend maintenance, easy contribution model for open source | - Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-08 after Phase 04 completion*
