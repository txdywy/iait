# Phase 1: Pipeline Skeleton - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-06
**Phase:** 1-Pipeline Skeleton
**Areas discussed:** Entity ID & file structure, Scraper interface shape, Incremental update strategy, Compiled output schemas

---

## Gray Area Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Entity ID & file structure | How are entities named and organized under public/data/entities/? Hierarchy scheme, naming convention. | |
| Scraper interface shape | What does the scraper interface look like? Methods, config, lifecycle hooks, registry discovery. | |
| Incremental update strategy | How does the pipeline decide what to skip? Content hash, timestamp, or always-write with dedup. | |
| Compiled output schemas | What goes into latest.json, rankings.json, and history.json? Frontend data contract. | |

**User's choice:** "这部分你来规划吧" (You plan this part) — delegated all decisions to Claude
**Notes:** User trusts Claude to make implementation decisions based on research context

---

## Entity ID & File Structure

**Claude's decisions (D-01 through D-04):**
- Flat namespace by entity type: `country/`, `city/`, `cloud-region/`, `company/` under `public/data/entities/`
- Lowercase kebab-case slugs: `us`, `aws-us-east-1`, `new-york`, `nvidia`
- Each file contains latest snapshot + full time-series array
- Phase 1 only populates `cloud-region/` (AWS pricing)

---

## Scraper Interface Shape

**Claude's decisions (D-05 through D-08):**
- TypeScript `Scraper` interface with `name`, `source` (layer enum), `fetch()` returning `NormalizedRecord[]`
- Schema: `{ source, entity, metric, value, unit, timestamp, confidence }` per PIPE-07
- Self-registering via central registry module
- Scrapers in `src/scrapers/`, shared utils in `src/scrapers/shared/`

---

## Incremental Update Strategy

**Claude's decisions (D-09 through D-12):**
- SHA-256 content hash of normalized records stored alongside entity files
- Hash comparison → skip write if unchanged
- Aggregate files rebuilt every run
- Pipeline metadata in `public/data/_pipeline-meta.json`

---

## Compiled Output Schemas

**Claude's decisions (D-13 through D-16):**
- `latest.json`: entities keyed by ID with score, factors, confidence, timestamp
- `rankings.json`: arrays by entity type, sorted by score descending
- `history.json`: entity ID → time-series array for chart rendering
- Phase 1 outputs use raw AWS pricing data (not yet composite-indexed)

---

## Claude's Discretion

All four gray areas were delegated to Claude. Decisions made based on:
- Research findings (per-entity file strategy, architecture patterns)
- Phase 1 requirements (PIPE-01, PIPE-06, PIPE-07, PIPE-08, PIPE-09, PIPE-10, INF-03)
- Downstream needs (Phase 2 extends scrapers, Phase 3 consumes outputs)

## Deferred Ideas

None
