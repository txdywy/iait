# Phase 2: Data Sources + Index Model - Context

**Gathered:** 2026-05-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Complete the compute index by adding 4 data sources (Azure GPU pricing, OWID energy data, World Bank energy indicators, SEC EDGAR AI CapEx) and building a composite scoring model that combines GPU_Supply, Energy_Capacity, Cloud_Region_Density, AI_CapEx, and Risk_Adjustment into a single ranked index per entity. Phase 2 upgrades the pipeline from raw single-source values to a multi-factor composite index with configurable weights, confidence propagation, and export-control risk adjustment.

This phase does NOT build the frontend, GitHub Actions automation, or any visualization. It extends the data pipeline and introduces the index model.

</domain>

<decisions>
## Implementation Decisions

### Index Composition
- **D-01:** Composite index formula: `Score = Σ(weight_i × normalized_factor_i) × risk_multiplier`. Five factors: GPU_Supply (cloud GPU pricing density), Energy_Capacity (power generation + consumption), Cloud_Region_Density (number of cloud regions/zones), AI_CapEx (company AI capital expenditure), Risk_Adjustment (export control tier)
- **D-02:** Each factor normalized to 0–100 via percentile ranking across all entities of the same type. Weights configurable in `public/data/index-config.json` with sensible defaults (e.g., GPU_Supply: 0.30, Energy_Capacity: 0.20, Cloud_Region_Density: 0.15, AI_CapEx: 0.25, Risk_Adjustment: 0.10)
- **D-03:** Missing factors degrade gracefully: if an entity has fewer than 3 factors, the available factors are re-weighted proportionally; confidence score is penalized (–1 per missing factor, floor at 1). Entities with only 1 factor get a minimum confidence of 1 and are flagged as "partial"

### Entity Mapping & Cross-Reference
- **D-04:** Entity cross-reference via a static mapping file `scripts/mappings/entity-crossref.json` that maps between AWS region codes, Azure region codes, ISO 3166-1 country codes, World Bank country codes, and SEC CIK numbers. Manual curation — no fuzzy matching
- **D-05:** Country-level aggregation: cloud region entities roll up to their parent country. A country's GPU_Supply factor is the sum/average of its cloud regions. Entity hierarchy: country > city > cloud-region, company is standalone
- **D-06:** MVP scope: 10 countries (US, CN, DE, GB, JP, IN, SG, NL, IE, CA), 20 cities (top cloud hubs), 5 cloud providers (AWS, Azure, GCP, Oracle, IBM — but only AWS and Azure have scrapers; others get manual/estimated entries)

### Confidence Scoring
- **D-07:** Per-source confidence ratings (fixed): structured_api = 5, rss_rules = 3, llm_extraction = 2, manual = 4. These map directly to the existing `DataSourceLayer` enum
- **D-08:** Entity-level confidence = weighted average of per-record confidence scores, penalized by data completeness (–1 per missing factor, floor at 1)
- **D-09:** Stale data penalty: if a record's timestamp is >30 days old, confidence drops by 1; >90 days, drops by 2

### SEC EDGAR Scope
- **D-10:** Track 5 companies: NVIDIA (CIK 1045810), Microsoft (CIK 789019), Alphabet/Google (CIK 1652044), Amazon (CIK 1018724), Meta (CIK 1326801)
- **D-11:** Extract CapEx from 10-K/10-Q XBRL filings using `us-gaap:PaymentsToAcquirePropertyPlantAndEquipment` tag. Quarterly data, annualized by summing last 4 quarters
- **D-12:** SEC EDGAR API requires a User-Agent header with contact email. Use a configurable env var `SEC_EDGAR_EMAIL` (default: repo owner's public email from package.json)

### Azure GPU Pricing Scraper
- **D-13:** Use Azure Retail Prices REST API (`https://prices.azure.com/api/retail/prices`) — free, no auth required, JSON response. Filter: `serviceName eq 'Virtual Machines' and priceType eq 'Consumption'` and GPU instance families (NC, ND, NV series)
- **D-14:** Azure regions map to entity cross-reference the same way as AWS regions

### OWID Energy Data
- **D-15:** Fetch from Our World in Data GitHub CSV (`https://raw.githubusercontent.com/owid/energy-data/master/owid-energy-data.csv`). Extract: `primary_energy_consumption`, `electricity_generation`, `renewables_share_elec` per country per year
- **D-16:** Annual data — use most recent year available. Map country names to ISO 3166-1 codes via the entity cross-reference

### World Bank Energy Indicators
- **D-17:** Use World Bank API v2 (`https://api.worldbank.org/v2/country/{code}/indicator/{indicator}?format=json`). Indicators: `EG.USE.ELEC.KH.PC` (electric power consumption per capita), `EG.ELC.PROD.KH` (electricity production)
- **D-18:** Annual data, same freshness handling as OWID. Provides per-capita normalization that OWID doesn't

### Export Control Risk Adjustment
- **D-19:** Static lookup table in `scripts/mappings/export-control-tiers.json`. Three tiers: Unrestricted (multiplier 1.0), Restricted (multiplier 0.7), Sanctioned (multiplier 0.3). Based on US BIS Entity List / EAR classifications
- **D-20:** MVP covers 10 countries. Tier assignments: US/GB/DE/NL/IE/CA/JP/SG = Unrestricted, IN = Restricted, CN = Sanctioned. These are approximations for trend modeling, not legal advice

### Claude's Discretion
- **D-21:** User delegated all implementation decisions for Phase 2. Claude has full flexibility on: scraper implementation details, test strategy, file organization, error handling approach, and any implementation trade-offs not specified above
- **D-22:** The code review from Phase 1 found 2 critical issues in `run-pipeline.ts` (CR-01: empty compile, CR-02: latest record ordering). Claude should fix these as part of Phase 2 compiler upgrades

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Context
- `.planning/PROJECT.md` — Core value, constraints, data source feasibility analysis
- `.planning/ROADMAP.md` — Phase 2 success criteria (5 specific checks), requirement IDs
- `.planning/phases/01-pipeline-skeleton/01-CONTEXT.md` — Phase 1 decisions (D-01 through D-18) — entity file structure, scraper interface, compiled output schemas

### Phase 1 Code (extend, don't rewrite)
- `scripts/types.ts` — `Scraper`, `NormalizedRecord`, `EntityType`, `DataSourceLayer` interfaces
- `scripts/registry.ts` — Scraper registry pattern (auto-discovery via glob)
- `scripts/compiler.ts` — Data compiler producing `latest.json`, `rankings.json`, `history.json`
- `scripts/run-pipeline.ts` — Pipeline orchestrator (has CR-01/CR-02 bugs to fix)
- `scripts/scrapers/aws-gpu-pricing.ts` — Reference scraper implementation
- `scripts/scrapers/aws-signature-v4.ts` — AWS Sig V4 signer (reference for auth patterns)

### Phase 1 Review
- `.planning/phases/01-pipeline-skeleton/01-REVIEW.md` — Code review findings (CR-01, CR-02 must be addressed)

### Research
- `.planning/research/SUMMARY.md` — Synthesized research on stack, architecture
- `.planning/research/ARCHITECTURE.md` — Per-entity file strategy, scraper registry pattern

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/fetch-with-retry.ts` — HTTP fetch with exponential backoff, jitter, AbortController timeout. Reuse for all new scrapers
- `scripts/hash.ts` — SHA-256 content hashing for incremental updates. Already wired into pipeline
- `scripts/registry.ts` — `getScrapers()` / `getScraper()` with glob-based auto-discovery. New scrapers in `scripts/scrapers/` are auto-registered
- `scripts/types.ts` — All interfaces ready for Phase 2. `NormalizedRecord` schema supports multi-source data. `EntityType` enum has all 4 types. `DataSourceLayer` enum has all 4 layers

### Established Patterns
- Scraper pattern: default export implementing `Scraper` interface, `fetch()` returns `NormalizedRecord[]`, lives in `scripts/scrapers/`
- ESM with NodeNext module resolution — all imports use `.js` extension
- Vitest for testing with `vi.stubGlobal('fetch', vi.fn())` pattern for HTTP mocking
- Per-entity JSON files under `public/data/entities/{type}/{id}.json`

### Integration Points
- New scrapers auto-discovered by `registry.ts` glob pattern (`scripts/scrapers/*.ts`)
- `compiler.ts` needs upgrading to compute composite index scores instead of raw values
- `run-pipeline.ts` orchestrator needs CR-01/CR-02 fixes and index computation step
- `index-config.json` (new) provides configurable weights consumed by the upgraded compiler
- `entity-crossref.json` (new) maps between different data source ID systems

</code_context>

<specifics>
## Specific Ideas

- No specific requirements from user — all decisions delegated to Claude based on Phase 1 patterns and ROADMAP requirements

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 2-Data Sources + Index Model*
*Context gathered: 2026-05-06*
