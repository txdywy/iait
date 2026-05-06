# Phase 1: Pipeline Skeleton - Context

**Gathered:** 2026-05-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Validated end-to-end pipeline from data fetch through normalized storage to compiled output. Phase 1 uses AWS GPU pricing (PIPE-01) as the single data source to prove the full pipeline: scraper fetches data, normalizes to per-entity JSON, and compiles aggregate outputs. The scraper interface + registry pattern (PIPE-06) ensures new sources can be added without modifying core pipeline code.

This phase does NOT build the frontend, the index model, additional data sources, or CI/CD automation.

</domain>

<decisions>
## Implementation Decisions

### Entity ID & File Structure
- **D-01:** Entity files organized by type under `public/data/entities/`: `country/{id}.json`, `city/{id}.json`, `cloud-region/{id}.json`, `company/{id}.json`
- **D-02:** Entity IDs are lowercase kebab-case slugs: `us`, `aws-us-east-1`, `new-york`, `nvidia`
- **D-03:** Each entity file contains both the latest snapshot and the full time-series array (single file per entity, per PIPE-09)
- **D-04:** For Phase 1, only `cloud-region/` entities will have data (AWS pricing). Other entity types will be empty directories with a `.gitkeep`

### Scraper Interface Shape
- **D-05:** TypeScript interface `Scraper` with: `name: string`, `source: DataSourceLayer` (enum: structured_api | rss_rules | llm_extraction | manual), `fetch(): Promise<NormalizedRecord[]>`, optional `config` for rate limits and retry settings
- **D-06:** `NormalizedRecord` schema: `{ source, entity, metric, value, unit, timestamp, confidence }` (per PIPE-07)
- **D-07:** Registry pattern: scrapers self-register via a central registry module. Adding a new scraper = implement interface + call `registry.register(new MyScraper())`. No core pipeline changes needed (PIPE-06)
- **D-08:** Scraper modules live in `src/scrapers/`, one file per data source. Shared utilities in `src/scrapers/shared/` (INF-03)

### Incremental Update Strategy
- **D-09:** Content hash of fetched data stored as metadata alongside each entity file (SHA-256 of the normalized records)
- **D-10:** Pipeline compares hash of new fetch vs stored hash — skip file write if unchanged (PIPE-08)
- **D-11:** `latest.json` and `rankings.json` are rebuilt every run from most recent entity files (cheap operation, always reflects current state)
- **D-12:** Pipeline metadata (last run timestamp, hash per entity, run status) stored in `public/data/_pipeline-meta.json`

### Compiled Output Schemas
- **D-13:** `latest.json` — `{ generated: ISO-timestamp, entities: { [entityId]: { type, name, score, factors: { [factorName]: value }, confidence, lastUpdated } } }`
- **D-14:** `rankings.json` — `{ generated: ISO-timestamp, byType: { countries: [...], cities: [...], cloudRegions: [...], companies: [...] } }` — each array sorted by score descending, entries contain `{ rank, entityId, score, confidence, change }`
- **D-15:** `history.json` — `{ [entityId]: { type, name, series: [{ timestamp, score, factors }] } }` — full time-series for chart rendering
- **D-16:** Phase 1 will produce these outputs with AWS pricing data only. Scores will be placeholder (raw price data, not yet composite-indexed — that's Phase 2)

### Claude's Discretion
- **D-17:** User delegated all implementation decisions. Claude chose the approaches above based on research findings (per-entity files, content hashing, TypeScript interfaces with registry pattern)
- **D-18:** Tooling choices left to Claude: package manager (pnpm preferred for monorepo-readiness), build tool (Vite per stack research), testing framework (Vitest)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `REQUIREMENTS.md` — All 32 v1 requirements with traceability table. Phase 1 covers PIPE-01, PIPE-06, PIPE-07, PIPE-08, PIPE-09, PIPE-10, INF-03

### Project Context
- `.planning/PROJECT.md` — Project vision, constraints, key decisions, data source feasibility analysis
- `.planning/ROADMAP.md` — Phase 1 success criteria (5 specific checks)

### Research
- `.planning/research/SUMMARY.md` — Synthesized research on stack, architecture, pitfalls
- `.planning/research/ARCHITECTURE.md` — Per-entity file strategy, scraper registry pattern, 4-phase build order
- `.planning/research/PITFALLS.md` — AWS pricing JSON size concern (50-100MB full export), XBRL parsing complexity (Phase 2 concern)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project. No source code exists yet.

### Established Patterns
- Stack decided in research: React 19.2.x, Vite 8.x, TypeScript, Tailwind CSS 4, Zustand 5.x
- Per-entity JSON file strategy validated in research as suitable for GitHub Pages static serving
- Scraper interface + registry pattern chosen in exploration session

### Integration Points
- Phase 1 outputs (`latest.json`, `rankings.json`, `history.json`, entity files) become Phase 3's data source
- Scraper interface from Phase 1 is extended by Phase 2 scrapers (Azure, OWID, World Bank, SEC EDGAR)
- Pipeline metadata (`_pipeline-meta.json`) feeds Phase 4's incremental update and data versioning

</code_context>

<specifics>
## Specific Ideas

- No specific requirements from user — all decisions delegated to Claude based on research
- AWS pricing as Phase 1 data source validates the full pipeline before scaling to 5+ sources in Phase 2

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 1-Pipeline Skeleton*
*Context gathered: 2026-05-06*
