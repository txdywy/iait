# Phase 2: Data Sources + Index Model - Research

**Researched:** 2026-05-06
**Status:** Ready for planning
**Scope:** 4 new scrapers (Azure GPU pricing, OWID energy, World Bank energy, SEC EDGAR CapEx), composite index model, entity cross-referencing, confidence scoring, export control risk adjustment, plus CR-01/CR-02 bug fixes from Phase 1 review.

---

## 1. Codebase Analysis: What Exists, What Needs Changing

### 1.1 Existing Assets (Reuse Directly)

| File | Purpose | Phase 2 Impact |
|------|---------|----------------|
| `scripts/types.ts` | `Scraper`, `NormalizedRecord`, `EntityType`, `DataSourceLayer` interfaces | Extend `CompiledEntity` with `riskMultiplier`, multi-factor scores. `NormalizedRecord` schema already supports multi-source. `EntityType` has all 4 types. |
| `scripts/fetch-with-retry.ts` | HTTP fetch with retry, backoff, jitter, timeout | Reuse for all 4 new scrapers. Azure API needs 100ms inter-page delay (15 req/s limit) — the existing `baseDelayMs` parameter handles this. |
| `scripts/hash.ts` | SHA-256 content hashing for incremental updates | No changes needed. Already works for any `NormalizedRecord[]`. |
| `scripts/registry.ts` | Glob-based scraper auto-discovery in `scripts/scrapers/` | No changes needed. New scraper files auto-register. |
| `scripts/scrapers/aws-gpu-pricing.ts` | Reference scraper implementation | Pattern to follow for Azure scraper. |
| `scripts/scrapers/aws-signature-v4.ts` | AWS Sig V4 signer | No reuse for Phase 2 scrapers (Azure/OWID/WorldBank/SEC need no auth or just User-Agent headers). |

### 1.2 Files Requiring Modification

| File | Changes Needed | Complexity |
|------|---------------|------------|
| `scripts/run-pipeline.ts` | **CR-01 fix**: Guard against compiling when no data produced. **CR-02 fix**: Sort records by timestamp before selecting `latest`. **New**: Add index computation step between entity write and compile. | Medium — must preserve existing pipeline flow while inserting new step. |
| `scripts/compiler.ts` | Upgrade from raw value pass-through to composite index scoring. Must read `index-config.json` for weights, compute percentile-normalized factors per entity, apply risk multiplier, propagate confidence. Entity `score` field becomes the composite index (0-100) instead of raw metric value. | High — core algorithmic change. Central to Phase 2 success criteria #2, #3, #4. |
| `scripts/types.ts` | Add `IndexConfig` type, `ExportControlTier` type, `EntityCrossRef` type. Extend `CompiledEntity` to include `riskTier`, `factorBreakdown` with normalized scores. Consider adding optional fields to `NormalizedRecord` or keeping it unchanged and handling multi-metric at the entity file level. | Low-Medium |

### 1.3 New Files to Create

| File | Purpose |
|------|---------|
| `scripts/scrapers/azure-gpu-pricing.ts` | Azure Retail Prices API scraper |
| `scripts/scrapers/owid-energy.ts` | OWID energy data CSV scraper |
| `scripts/scrapers/world-bank-energy.ts` | World Bank API scraper |
| `scripts/scrapers/sec-edgar-capex.ts` | SEC EDGAR XBRL companyfacts scraper |
| `scripts/index-model.ts` | Composite index computation: normalization, weighting, risk adjustment, confidence propagation |
| `scripts/mappings/entity-crossref.json` | Cross-reference mapping between data source ID systems |
| `scripts/mappings/export-control-tiers.json` | Country export control tier lookup table |
| `public/data/index-config.json` | Configurable factor weights (consumed by compiler) |
| `scripts/__tests__/azure-gpu-pricing.test.ts` | Azure scraper tests |
| `scripts/__tests__/owid-energy.test.ts` | OWID scraper tests |
| `scripts/__tests__/world-bank-energy.test.ts` | World Bank scraper tests |
| `scripts/__tests__/sec-edgar-capex.test.ts` | SEC EDGAR scraper tests |
| `scripts/__tests__/index-model.test.ts` | Composite index model tests |
| `scripts/__tests__/fixtures/azure-api-response.json` | Azure API fixture |
| `scripts/__tests__/fixtures/owid-energy-sample.csv` | OWID CSV fixture |
| `scripts/__tests__/fixtures/world-bank-response.json` | World Bank API fixture |
| `scripts/__tests__/fixtures/sec-edgar-companyfacts.json` | SEC EDGAR fixture |

### 1.4 Entity File Structure Evolution

Phase 1 entity files contain records from a single source (AWS pricing). Phase 2 introduces multi-source entities — a country like `us` will have records from OWID, World Bank, and aggregated cloud pricing. The `EntityFile` type stores all records in `series[]` and `latest` points to the most recent record. However, "latest" for a multi-factor entity is ambiguous because different factors update at different frequencies (cloud pricing: daily, energy: annually, CapEx: quarterly).

**Decision needed in planning:** Either:
- (A) Keep one `EntityFile` per entity, merge all source records into one `series[]`, select `latest` as the most recent record regardless of source. The compiler reads all records and extracts per-factor values.
- (B) One `EntityFile` per entity per source (e.g., `country/us-energy.json`, `country/us-cloud.json`). Compiler merges at compile time.

**Recommendation: Option A** — single file per entity, all sources merged. Simpler frontend consumption, consistent with Phase 1 pattern, and the compiler already reads all records. The `latest` field becomes less meaningful for multi-metric entities, but the compiler's index computation handles this correctly by looking at the most recent record per metric rather than a single latest.

---

## 2. API Research: Data Source Details

### 2.1 Azure Retail Prices API

**Endpoint:** `https://prices.azure.com/api/retail/prices`

**Authentication:** None required. Fully public, unauthenticated API.

**Rate Limit:** 15 requests/second (from research). No daily call limit.

**Filtering (OData):**
```
$filter=serviceName eq 'Virtual Machines' and priceType eq 'Consumption'
```
- Filter values are **case-sensitive** in API version `2023-01-01-preview` and later
- GPU families to target: NC (NVIDIA), ND (NVIDIA), NV (NVIDIA) series
- Filter by `armSkuName` using `contains()` for GPU series: `contains(armSkuName, 'NC')` OR build multiple queries per family

**Pagination:**
- Max 1,000 records per response
- Response includes `NextPageLink` field with full URL for next page
- Follow `NextPageLink` until `null`

**Response Schema (key fields):**
```typescript
interface AzurePriceItem {
  currencyCode: string;       // "USD"
  retailPrice: number;        // e.g., 0.176346
  unitPrice: number;          // same as retailPrice
  armRegionName: string;      // e.g., "westeurope" — maps to entity ID
  location: string;           // e.g., "EU West" — human-readable
  armSkuName: string;         // e.g., "Standard_NC6s_v3" — instance type
  meterName: string;          // e.g., "NC6s v3"
  productName: string;        // e.g., "Virtual Machines NC Series"
  skuName: string;            // e.g., "NC6s v3"
  serviceName: string;        // "Virtual Machines"
  serviceFamily: string;      // "Compute"
  unitOfMeasure: string;      // "1 Hour"
  type: string;               // "Consumption" | "Reservation" | "DevTestConsumption"
  isPrimaryMeterRegion: boolean;
  effectiveStartDate: string; // ISO date
}
```

**GPU Series Identification Strategy:**
- NC series: Training/inference (T4, A100)
- ND series: Distributed training (A100, H100)
- NV series: Visualization + rendering (T4, A10)
- Filter: `armSkuName` starts with `Standard_NC`, `Standard_ND`, `Standard_NV`
- OData filter: `contains(armSkuName, 'Standard_NC') or contains(armSkuName, 'Standard_ND') or contains(armSkuName, 'Standard_NV')`
- **Caveat:** OData `or` with `contains()` may need multiple queries if the API doesn't support `or` across `contains()` calls. Test with single query first; fall back to 3 parallel queries if needed.

**Entity Mapping:** `armRegionName` (e.g., `"westeurope"`) maps to entity ID `azure-westeurope`. Cross-reference via `entity-crossref.json` maps Azure regions to countries.

**Scraper Complexity:** Low-Medium. Similar to AWS scraper but simpler — no Sig V4 auth, cleaner JSON response, straightforward OData filtering.

### 2.2 OWID Energy Data

**Endpoint:** `https://raw.githubusercontent.com/owid/energy-data/master/owid-energy-data.csv`

**Authentication:** None.

**Rate Limit:** GitHub raw file serving — no published hard limit. Single download per run.

**Data Format:** CSV, one row per country per year.

**Key Columns (verified from codebook):**
| Column | Description | Unit |
|--------|-------------|------|
| `country` | Country name (standardized, NOT ISO code) | text |
| `year` | Year of observation | integer |
| `primary_energy_consumption` | Total primary energy consumption | TWh |
| `electricity_generation` | Total electricity generation | TWh |
| `renewables_share_elec` | Share of electricity from renewables | % |
| `energy_per_capita` | Primary energy per capita | kWh/person |
| `per_capita_electricity` | Electricity generation per person | kWh |

**Country Name to ISO Mapping Challenge:**
- OWID uses standardized country names, NOT ISO codes
- Example: "United States" not "US", "United Kingdom" not "GB"
- Must build a name-to-ISO mapping in `entity-crossref.json`
- MVP covers only 10 countries — manual mapping is feasible and preferable to fuzzy matching (per D-04)

**Freshness:** Annual data. Most recent update: 2026-04-27 (Ember electricity data). Use most recent year available per country (per D-15).

**CSV Parsing:** Need a CSV parser. Options:
1. **No dependency — manual split**: CSV is well-formed, no quoted commas in values. `line.split(',')` works for this dataset. Fragile but zero-dependency.
2. **Lightweight parser**: `csv-parse/sync` from Node.js built-in (not built-in; it's the `csv-parse` npm package). ~20KB.
3. **Custom streaming parser**: Overkill for a single CSV file.

**Recommendation:** Use manual parsing. The OWID CSV has numeric values and simple country names — no quoted fields with commas. A `line.split(',')` approach with header indexing is sufficient and avoids adding a dependency. If edge cases appear, add `csv-parse` later.

**Data Volume:** ~30,000 rows (200+ countries x ~150 years). But we only need the most recent year for 10 countries. Parse all rows, filter to MVP countries, take max year.

**Scraper Complexity:** Low. Single HTTP GET, parse CSV, filter, normalize.

### 2.3 World Bank API v2

**Endpoint:** `https://api.worldbank.org/v2/country/{codes}/indicator/{indicator}?format=json`

**Authentication:** None required.

**Rate Limit:** No published hard limit. Pagination-based.

**Indicators Needed:**
| Indicator Code | Description | Unit |
|---------------|-------------|------|
| `EG.USE.ELEC.KH.PC` | Electric power consumption per capita | kWh |
| `EG.ELC.PROD.KH` | Electricity production | kWh |

**Multiple Countries in One Call:**
```
https://api.worldbank.org/v2/country/USA;CHN;DEU;GBR;JPN;IND;SGP;NLD;IRL;CAN/indicator/EG.USE.ELEC.KH.PC?format=json&per_page=1000&mrnev=1
```
- Country codes: ISO 3166-1 alpha-3 (USA, CHN, DEU, etc.)
- `mrnev=1` returns most recent non-empty value
- `per_page=1000` avoids pagination for small result sets

**Response Structure (JSON):**
```json
[
  { "page": 1, "pages": 1, "per_page": 1000, "total": 10 },
  [
    {
      "indicator": { "id": "EG.USE.ELEC.KH.PC", "value": "Electric power consumption (kWh per capita)" },
      "country": { "id": "US", "value": "United States" },
      "countryiso3code": "USA",
      "date": "2014",
      "value": 12984.38,
      "unit": "",
      "obs_status": "",
      "decimal": 0
    }
  ]
]
```
- Response is an array of 2 elements: `[metadata, data_array]`
- `value` can be `null` for missing data
- `date` is the year as a string

**Data Staleness Warning:** World Bank electricity indicators can be 2-8 years behind current year. `EG.USE.ELEC.KH.PC` latest data may be from 2021 or earlier. This is acceptable for trend modeling (per D-09: stale data penalty applied).

**Scraper Complexity:** Low. Two API calls (one per indicator), straightforward JSON parsing.

### 2.4 SEC EDGAR XBRL CompanyFacts API

**Endpoint:** `https://data.sec.gov/api/xbrl/companyfacts/CIK{padded_cik}.json`

- CIK must be zero-padded to 10 digits: `CIK0001045810` for NVIDIA
- Alternative per-concept endpoint: `https://data.sec.gov/api/xbrl/companyconcept/CIK{padded_cik}/us-gaap/PaymentsToAcquirePropertyPlantAndEquipment.json`

**Authentication:** No API key required. BUT requires a `User-Agent` header with contact email.
```
User-Agent: ComputeAtlas/0.1.0 (contact@example.com)
```
Without this header, requests are blocked with 403.

**Rate Limit:** 10 requests/second. For 5 companies x 1 concept = 5 requests. Well within limits.

**Target Companies (from D-10):**
| Company | CIK | Padded CIK |
|---------|-----|------------|
| NVIDIA | 1045810 | 0001045810 |
| Microsoft | 789019 | 0000789019 |
| Alphabet/Google | 1652044 | 0001652044 |
| Amazon | 1018724 | 0001018724 |
| Meta | 1326801 | 0001326801 |

**XBRL Tag:** `us-gaap:PaymentsToAcquirePropertyPlantAndEquipment`

**CompanyConcept Response Structure (expected):**
```json
{
  "cik": 1045810,
  "taxonomy": "us-gaap",
  "tag": "PaymentsToAcquirePropertyPlantAndEquipment",
  "label": "Payments to Acquire Property, Plant, and Equipment",
  "description": "...",
  "entityName": "NVIDIA CORP",
  "units": {
    "USD": [
      {
        "end": "2024-01-28",
        "val": 1069000000,
        "accn": "0001045810-24-000029",
        "fy": 2024,
        "fp": "FY",
        "form": "10-K",
        "filed": "2024-02-21",
        "frame": "CY2023Q4I"
      },
      {
        "end": "2024-04-28",
        "val": 369000000,
        "accn": "0001045810-24-000053",
        "fy": 2025,
        "fp": "Q1",
        "form": "10-Q",
        "filed": "2024-05-29"
      }
    ]
  }
}
```

**Key Fields:**
- `val`: Value in USD (may be in raw dollars, not millions — varies by company. NVIDIA reports in thousands, so 1069000000 = $1.069B)
- `end`: Period end date
- `fp`: Filing period — "FY" for annual, "Q1"/"Q2"/"Q3"/"Q4" for quarterly
- `form`: "10-K" (annual) or "10-Q" (quarterly)
- `filed`: Date filed with SEC
- `frame`: SEC frame identifier (useful for deduplication)

**Critical Pitfalls (from PITFALLS.md #4):**
1. **Unit scaling varies by company.** Some report in thousands, some in millions, some in raw dollars. Must check SEC filing context for `<us-gaap:PaymentsToAcquirePropertyPlantAndEquipment decimals="-6" unitRef="usd">` — the `decimals` attribute indicates scale.
2. **Amended filings (10-K/A, 10-Q/A)** may supersede earlier data. Filter for latest filing per period.
3. **Sign errors:** CapEx is typically a cash outflow (negative in cash flow statement per GAAP). The XBRL tag `PaymentsToAcquirePropertyPlantAndEquipment` is defined as a debit (positive value for cash paid). However, some companies report it with different signs. Apply `Math.abs()` to normalize.
4. **Quarterly annualization:** Sum last 4 quarters (trailing twelve months, TTM) per D-11.

**Sanity Bounds (recommended):**
- Flag any CapEx value > $100B or < $100M for these large companies
- Flag any quarter-over-quarter change > 10x
- Cross-reference `PaymentsToAcquirePropertyPlantAndEquipment` with `CapitalExpenditureIncurredButNotYetPaid` if available

**Scraper Complexity:** Medium-High. Must handle XBRL response parsing, unit normalization, TTM calculation, duplicate filing deduplication, and sanity checking.

---

## 3. Index Model Architecture

### 3.1 Composite Index Formula

Per D-01: `Score = Sum(weight_i x normalized_factor_i) x risk_multiplier`

**Five Factors:**

| Factor | Weight (D-02) | Data Sources | Entity Levels |
|--------|---------------|-------------|---------------|
| GPU_Supply | 0.30 | AWS pricing, Azure pricing | cloud-region, (city/country via rollup) |
| Energy_Capacity | 0.20 | OWID energy, World Bank | country |
| Cloud_Region_Density | 0.15 | Count of cloud regions per entity | country, city |
| AI_CapEx | 0.25 | SEC EDGAR | company, (country via mapping) |
| Risk_Adjustment | 0.10 | Export control tiers | country |

### 3.2 Normalization: Percentile Ranking

Per D-02: Each factor normalized to 0-100 via percentile ranking across all entities of the same type.

**Algorithm:**
```
percentile_rank(value, all_values) = (count of values <= value) / total_count * 100
```

- Must compute per entity type (countries ranked against countries, not against cloud regions)
- Ties get the same percentile rank
- If only 1 entity for a type, the percentile rank is 50 (neutral)

**Edge Cases:**
- Entity has no data for a factor: factor is absent, not zero. Re-weight remaining factors (per D-03).
- All entities have same value for a factor: all get percentile 50.

### 3.3 Confidence Scoring

Per D-07, D-08, D-09:

**Per-source confidence (fixed):**
| Source Layer | Confidence |
|-------------|-----------|
| `structured_api` | 5 |
| `rss_rules` | 3 |
| `llm_extraction` | 2 |
| `manual` | 4 |

**Entity-level confidence:**
```
entity_confidence = weighted_average(per_record_confidence) - missing_factor_penalty
```
- `missing_factor_penalty` = 1 per missing factor, floor at 1
- Weighted by factor weight

**Staleness penalty (D-09):**
- Record > 30 days old: confidence -= 1
- Record > 90 days old: confidence -= 2
- Floor at 1

**Graceful degradation (D-03):**
- < 3 factors available: re-weight proportionally, confidence penalized
- Only 1 factor: minimum confidence 1, entity flagged as "partial"

### 3.4 Risk Adjustment

Per D-19, D-20:

**Export control tiers:**
| Tier | Multiplier | Countries |
|------|-----------|-----------|
| Unrestricted | 1.0 | US, GB, DE, NL, IE, CA, JP, SG |
| Restricted | 0.7 | IN |
| Sanctioned | 0.3 | CN |

Applied as: `final_score = raw_composite_score * risk_multiplier`

This affects only country-level entities. Cloud regions and cities inherit their parent country's risk multiplier. Companies are standalone and get multiplier 1.0 (they're US-listed companies).

### 3.5 Entity Cross-Reference Design

Per D-04, D-05: Static mapping file `scripts/mappings/entity-crossref.json`.

**Structure:**
```json
{
  "countries": {
    "us": {
      "iso2": "US",
      "iso3": "USA",
      "worldBankCode": "USA",
      "owidName": "United States",
      "name": "United States",
      "riskTier": "unrestricted"
    },
    "cn": {
      "iso2": "CN",
      "iso3": "CHN",
      "worldBankCode": "CHN",
      "owidName": "China",
      "name": "China",
      "riskTier": "sanctioned"
    }
  },
  "cloudRegions": {
    "aws-us-east-1": { "country": "us", "city": "ashburn", "provider": "aws" },
    "azure-eastus": { "country": "us", "city": "ashburn", "provider": "azure" }
  },
  "cities": {
    "ashburn": { "country": "us", "name": "Ashburn, VA" },
    "dublin": { "country": "ie", "name": "Dublin" }
  },
  "companies": {
    "nvidia": { "cik": "0001045810", "country": "us", "name": "NVIDIA" },
    "microsoft": { "cik": "0000789019", "country": "us", "name": "Microsoft" }
  }
}
```

**Key Design Decisions:**
- Azure `armRegionName` (e.g., `"eastus"`) maps to entity ID `"azure-eastus"` and then to country via crossref
- AWS location names (e.g., `"US East (N. Virginia)"`) already have entity IDs from Phase 1; crossref adds country mapping
- OWID country names (e.g., `"United States"`) map to ISO codes via crossref
- World Bank uses ISO-3 codes (e.g., `"USA"`) which map directly
- SEC uses CIK numbers which map to company entity IDs

### 3.6 Country-Level Aggregation

Per D-05: Cloud region data rolls up to parent country.

**GPU_Supply for a country** = average of all cloud region GPU_Supply scores within that country.

**Cloud_Region_Density** = count of distinct cloud regions (across all providers) in that country. Normalized via percentile ranking.

**Energy_Capacity** = directly from OWID/World Bank (already country-level).

**AI_CapEx** = sum of company CapEx for companies headquartered in that country. For MVP, all 5 companies are US-headquartered. Other countries get no AI_CapEx data (graceful degradation applies).

---

## 4. Compiler Upgrade Strategy

### 4.1 Current Compiler Flow (Phase 1)

```
loadAllEntities() -> writeLatest() -> writeRankings() -> writeHistory()
```

Each function treats `entity.latest.value` as the score. This is a raw metric value (e.g., GPU price in USD/hr).

### 4.2 Target Compiler Flow (Phase 2)

```
loadAllEntities()
  -> loadIndexConfig()          // NEW: read weights from index-config.json
  -> loadCrossRef()             // NEW: read entity cross-reference
  -> loadExportControlTiers()   // NEW: read risk tiers
  -> aggregateToCountries()     // NEW: roll up cloud regions to countries
  -> computeFactors()           // NEW: extract per-factor values from records
  -> normalizeFactors()         // NEW: percentile ranking per entity type
  -> computeCompositeIndex()    // NEW: weighted sum + risk adjustment
  -> computeConfidence()        // NEW: confidence scoring with staleness
  -> writeLatest()              // MODIFIED: use composite score
  -> writeRankings()            // MODIFIED: use composite score
  -> writeHistory()             // MODIFIED: use composite score
```

**Key Insight:** The index computation should be a separate module (`scripts/index-model.ts`) that the compiler imports. This keeps the compiler focused on I/O (reading entities, writing outputs) and the index model focused on computation (normalization, weighting, scoring). Easier to test independently.

### 4.3 Multi-Metric Entity Files

Phase 1 entities have one metric (`gpu-price-hr`). Phase 2 entities may have multiple metrics from different sources:

```json
{
  "id": "us",
  "type": "country",
  "latest": { "source": "owid-energy", "metric": "electricity-generation", "value": 4178, ... },
  "series": [
    { "source": "owid-energy", "metric": "electricity-generation", "value": 4178, ... },
    { "source": "owid-energy", "metric": "renewables-share-elec", "value": 21.3, ... },
    { "source": "world-bank-energy", "metric": "electricity-per-capita", "value": 12984, ... },
    { "source": "aws-gpu-pricing", "metric": "gpu-supply-score", "value": 85, ... }
  ]
}
```

**`latest` field ambiguity:** With multiple metrics, which record is "latest"? Options:
- (A) Most recent by timestamp across all metrics — simple but potentially misleading
- (B) Remove `latest` dependency; compiler extracts per-metric latest directly from `series[]`

**Recommendation: Option B** for the index model. The `latest` field can still point to the most recent record by timestamp (for backward compatibility and entity file display), but the index computation should scan `series[]` to find the most recent record per metric.

---

## 5. Pipeline Orchestration Changes

### 5.1 CR-01 Fix: Empty Compile Guard

**Problem:** `compile()` runs even when all scrapers return zero records, potentially overwriting valid data with empty outputs.

**Fix:**
```typescript
// After scraper loop
if (written === 0 && Object.keys(meta.entities).length === 0) {
  console.warn('[pipeline] No data produced and no existing entities. Skipping compile.');
  return;
}
```

This guards against first-run-with-no-scrapers and all-scrapers-failed scenarios while still recompiling when existing entity files are present.

### 5.2 CR-02 Fix: Latest Record Sorting

**Problem:** `records[records.length - 1]` is used as "latest" but array is in insertion order, not timestamp order.

**Fix:**
```typescript
const sortedByTime = [...records].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
const entityFile: EntityFile = {
  ...
  latest: sortedByTime[sortedByTime.length - 1],
  series: sortedByTime,
  ...
};
```

### 5.3 Multi-Source Entity Merging

New challenge: Multiple scrapers may produce records for the same entity (e.g., `country/us` gets records from OWID, World Bank, and aggregated cloud pricing). The current pipeline groups records by entity per scraper. Need to merge across scrapers.

**Strategy:**
1. After all scrapers run, build a unified `Map<entityId, NormalizedRecord[]>` across all scrapers
2. For each entity, load existing entity file (if any) to get historical records
3. Merge new records into existing series (deduplicate by source+metric+timestamp)
4. Write merged entity file

This is a non-trivial change to `run-pipeline.ts` because the current loop writes per-scraper. Needs restructuring to collect-then-write.

### 5.4 Index Computation Step

After entity files are written and before `compile()`, run the index model:
1. Load all entity files
2. Load index config, crossref, export control tiers
3. Compute composite index per entity
4. Write index scores into entity files (or a separate index output)
5. Then `compile()` reads index-augmented entities

**Alternative:** Have `compile()` itself run the index computation. This is simpler but couples I/O and computation. Prefer the separate step for testability.

---

## 6. Configuration Files

### 6.1 `public/data/index-config.json`

```json
{
  "version": 1,
  "factors": {
    "gpu_supply": { "weight": 0.30, "description": "GPU pricing density across cloud regions" },
    "energy_capacity": { "weight": 0.20, "description": "Power generation and consumption capacity" },
    "cloud_region_density": { "weight": 0.15, "description": "Number of cloud regions/zones" },
    "ai_capex": { "weight": 0.25, "description": "Company AI capital expenditure" },
    "risk_adjustment": { "weight": 0.10, "description": "Export control risk tier" }
  },
  "confidence": {
    "staleDays": 30,
    "stalePenalty": 1,
    "veryStaledays": 90,
    "veryStlePenalty": 2,
    "missingFactorPenalty": 1,
    "minConfidence": 1
  }
}
```

### 6.2 `scripts/mappings/export-control-tiers.json`

```json
{
  "version": 1,
  "tiers": {
    "unrestricted": { "multiplier": 1.0, "description": "No export restrictions on AI compute hardware" },
    "restricted": { "multiplier": 0.7, "description": "Partial restrictions on advanced AI chips" },
    "sanctioned": { "multiplier": 0.3, "description": "Broad restrictions on AI compute exports" }
  },
  "countries": {
    "us": "unrestricted",
    "gb": "unrestricted",
    "de": "unrestricted",
    "nl": "unrestricted",
    "ie": "unrestricted",
    "ca": "unrestricted",
    "jp": "unrestricted",
    "sg": "unrestricted",
    "in": "restricted",
    "cn": "sanctioned"
  }
}
```

---

## 7. Dependency Analysis

### 7.1 New Dependencies Needed

| Package | Purpose | Size | Alternative |
|---------|---------|------|-------------|
| None | — | — | — |

**No new npm dependencies required.** All 4 scrapers use native `fetch()`. CSV parsing can be done manually. JSON APIs return JSON. The index model is pure computation.

### 7.2 Existing Dependencies (unchanged)

- `tsx`: TypeScript execution for pipeline scripts
- `vitest`: Test runner
- `glob`: Scraper auto-discovery
- `typescript`: Type checking
- `@types/node`: Node.js type definitions

---

## 8. Testing Strategy

### 8.1 Unit Test Coverage

| Component | Tests | Approach |
|-----------|-------|----------|
| Azure scraper | Normalize response, handle pagination, filter GPU families, handle empty response | Mock fetch with fixture |
| OWID scraper | Parse CSV, filter to MVP countries, handle missing values, extract correct columns | Mock fetch with CSV fixture |
| World Bank scraper | Parse JSON response, handle null values, extract per-country data | Mock fetch with JSON fixture |
| SEC EDGAR scraper | Parse XBRL response, TTM calculation, sanity bounds, handle amended filings | Mock fetch with JSON fixture |
| Index model (normalization) | Percentile ranking, edge cases (single entity, all same value, missing factors) | Pure function tests |
| Index model (composite) | Weighted sum, risk adjustment, confidence propagation, graceful degradation | Pure function tests |
| Entity cross-reference | Lookup by various ID types, handle missing entries | Pure function tests |
| Pipeline (CR-01) | Empty compile guard triggers when no data | Integration test with mocks |
| Pipeline (CR-02) | Latest record is most recent by timestamp | Integration test |
| Pipeline (multi-source merge) | Records from multiple scrapers merge correctly | Integration test with mocks |

### 8.2 Test Fixtures

Each scraper needs a realistic but minimal fixture:
- **Azure:** 3-5 price items across 2 regions, including NC/ND/NV families
- **OWID:** 5-10 rows covering 3 countries with all target columns
- **World Bank:** Response with metadata + data array for 3 countries
- **SEC EDGAR:** CompanyConcept response with 4 quarters of CapEx data

### 8.3 Integration Considerations

The full pipeline test (scraper -> entity write -> index computation -> compile) should be tested as an integration test but with mocked HTTP calls. No real API calls in CI.

---

## 9. Risk Analysis

### 9.1 Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Azure API OData filtering doesn't support `or` across `contains()` | Medium | Low — just make 3 separate queries | Test with single query first |
| SEC EDGAR unit scaling varies between companies | High | High — wrong CapEx values | Parse `decimals` attribute from filing, apply sanity bounds |
| World Bank electricity data is very stale (2020 or earlier) | High | Medium — affects trend signal | Apply staleness penalty, document in confidence score |
| OWID CSV format changes | Low | Medium — parser breaks | Pin to specific commit SHA or add schema validation |
| Entity merge across scrapers introduces ordering bugs | Medium | Medium — incorrect latest/series | Comprehensive sort-by-timestamp tests |
| Percentile ranking with few entities (10 countries) produces coarse scores | High | Low — known limitation | Document in methodology; percentile still differentiates |

### 9.2 Scope Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Entity cross-reference mapping errors | Medium | High — wrong country assignments | Manual verification of all 10 countries, 20 cities |
| Index weights need tuning after seeing real data | High | Low — weights are configurable | Use index-config.json; can adjust without code changes |
| Multi-source entity merging is more complex than estimated | Medium | Medium — delays delivery | Start with merge logic; can simplify by processing sources sequentially |

---

## 10. Wave Structure Recommendation

Based on dependency analysis, Phase 2 work can be organized into 3 waves:

**Wave 1 (Foundation):** Bug fixes + static data + types
- Fix CR-01, CR-02 in `run-pipeline.ts`
- Create entity cross-reference mapping (`entity-crossref.json`)
- Create export control tiers (`export-control-tiers.json`)
- Create index config (`index-config.json`)
- Extend types as needed

**Wave 2 (Scrapers):** All 4 new scrapers (parallelizable)
- Azure GPU pricing scraper + tests
- OWID energy scraper + tests
- World Bank energy scraper + tests
- SEC EDGAR CapEx scraper + tests

**Wave 3 (Index Model + Integration):** Core index computation + pipeline integration
- Index model (`index-model.ts`) with normalization, weighting, risk adjustment, confidence
- Compiler upgrade to use composite index
- Pipeline upgrade for multi-source entity merging
- Integration tests

Wave 2 scrapers are independent of each other and can be developed in parallel. Wave 3 depends on Wave 1 (config files) and Wave 2 (scraper data shapes known).

---

## 11. Open Questions for Planning

1. **Entity file merging strategy:** Should the pipeline merge all scraper outputs into unified entity files in a single pass, or should it write per-source and have the compiler merge? (Recommendation: single pass in pipeline, per section 5.3)
   **(RESOLVED in 02-04 Plan):** Pipeline collects all scraper outputs first, then writes merged entity files (single-pass approach). See 02-04 Task 2 Part B.

2. **City entity creation:** Phase 2 success criteria mention 20 cities. No scraper produces city-level data directly. Cities are derived from cloud region mapping (e.g., `azure-eastus` -> Ashburn, VA). Should city entities be created during aggregation? (Recommendation: yes, as part of the aggregation step in the compiler)
   **(RESOLVED in 02-04 Plan):** City entities are derived at aggregation time via `aggregateToCities()` in `scripts/index-model.ts`. This function rolls up cloud-region GPU_Supply to parent city (average) and counts cloud_region_density per city using the crossref `city` field. No separate city entity files are created — cities are virtual entities computed during compilation. The entity-crossref.json `cities` section maps 20 city IDs to country + display names. The compiler calls `aggregateToCities()` after `aggregateToCountries()` to produce city-level factors. See 02-04 Task 1.

3. **Cloud providers beyond AWS/Azure:** D-06 mentions GCP, Oracle, IBM but only AWS and Azure have scrapers. Should we create manual entity entries for the other 3? (Recommendation: yes, minimal entries in entity-crossref with confidence=4/manual layer)
   **(RESOLVED in 02-01 Plan):** 02-01 Task 3 creates 5 seed entity files under `public/data/entities/cloud-region/` for GCP (gcp-us-central1, gcp-europe-west1, gcp-asia-east1), Oracle (oracle-us-ashburn-1), and IBM (ibm-us-south) with source `manual-seed`, DataSourceLayer.MANUAL, and confidence 4 per D-07. Entity IDs match entity-crossref.json keys exactly. These seed files contain gpu-price-hr metric with estimated placeholder values so the pipeline and index model can include them alongside AWS/Azure scraped data. Staleness penalty applies per D-09 since timestamps are 2025-01-01.

4. **Index computation timing:** Should the index be computed during `run-pipeline.ts` (before compile) or during `compile()` itself? (Recommendation: during compile, since compile already loads all entities -- keep pipeline focused on data collection)
   **(RESOLVED in 02-04 Plan):** Index computation happens inside compile() via index-model.ts functions. Pipeline focuses on data collection and entity merging. See 02-04 Task 2 Part A.

---

*Note: All open questions above have been resolved during Phase 2 planning. See plan files for implementation details.*


*Phase: 2-Data Sources + Index Model*
*Research completed: 2026-05-06*
