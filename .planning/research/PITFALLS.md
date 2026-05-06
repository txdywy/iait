# Domain Pitfalls

**Domain:** Global AI Compute Index & Heatmap Platform (ComputeAtlas)
**Researched:** 2026-05-06
**Overall confidence:** MEDIUM (mix of verified official docs and training data)

## Critical Pitfalls

Mistakes that cause rewrites, data loss, or project failure.

### Pitfall 1: GitHub Actions Scheduled Workflow Unreliability

**What goes wrong:** The 4x daily (UTC 0/6/12/18) cron schedule silently skips runs or drops jobs during high-load periods. GitHub's docs explicitly state: "If the load is sufficiently high enough, some queued jobs may be dropped." Additionally, public repos with no activity for 60 days have scheduled workflows automatically disabled.

**Why it happens:** GitHub Actions cron scheduling is best-effort, not guaranteed. Workflows at the top of every hour (exactly UTC 0/6/12/18) collide with peak load from other repos. Workflows also only run on the default branch and the file must exist there.

**Consequences:**
- Data gaps in time series that look like "no compute growth happened" to index consumers
- Silent 60-day disables if nobody pushes to the repo for two months (common in automated repos)
- Users lose trust in the index when "yesterday's data" is missing with no explanation

**Prevention:**
- Offset cron to avoid top-of-hour peaks (e.g., `7 0,6,12,18 * * *` instead of `0 0,6,12,18 * * *`)
- Add a monitoring step that checks for missed runs by comparing expected vs. actual data timestamps
- Implement a "heartbeat" commit (auto-commit or issue creation) within 60 days to prevent auto-disable
- Build a "staleness indicator" in the frontend that shows data age, not just data value
- Use workflow concurrency groups with `cancel-in-progress: false` to prevent new runs from canceling in-flight data collection

**Detection:** Log run timestamps in the committed JSON. Frontend should flag any data older than 36 hours as "stale."

**Phase to address:** Phase 1 (Infrastructure). Must be baked into the Actions workflow design from the start.

---

### Pitfall 2: GitHub Actions Artifact/Cache Storage Ceiling

**What goes wrong:** The free plan has 500 MB total artifact storage (shared with GitHub Packages) and 10 GB cache per repo. A daily data pipeline with 4 runs/day generating historical JSON snapshots will exceed 500 MB within weeks if artifacts are not managed. Cache entries auto-evict after 7 days of no access.

**Why it happens:** Each run generates JSON data files. If you store historical snapshots as artifacts (for rollback or diffing), storage fills fast. If you use cache to avoid refetching source data, the 7-day eviction means unused sources disappear.

**Consequences:**
- Failed workflow runs when artifact upload exceeds storage limit
- Lost historical data if only stored as artifacts
- Data refetching from scratch when cache evicts (slow, rate-limited)

**Prevention:**
- Commit data directly to the repository (or a `data` branch) instead of relying on artifacts. Git history provides rollback.
- Keep artifact retention at minimum (1 day) or use artifacts only for debugging
- Pre-aggregate data to reduce file size: one `latest.json` per entity instead of timestamped snapshots
- Use cache only for API response caching with explicit restore-keys fallback
- Monitor storage usage via `actions/cache` hit/miss stats

**Detection:** Workflow failures with "artifact upload failed" or "cache upload failed" errors. Monitor via GitHub API: `GET /repos/{owner}/{repo}/actions/cache/usage`.

**Phase to address:** Phase 1 (Infrastructure). Data storage strategy must be decided before the first workflow runs.

---

### Pitfall 3: LLM Extraction Non-Determinism Breaking Index Consistency

**What goes wrong:** Running the same LLM extraction prompt on the same news article across different runs produces different structured outputs. With 150 requests/day and 4 runs/day, you get ~37 calls per run. If extraction results for the same input jitter between runs, the index value oscillates without any real-world change, destroying trend signal value.

**Why it happens:** LLMs are non-deterministic even at `temperature=0` due to floating-point arithmetic in batching. Minor rewording of prompts, different API versions, or model updates (GitHub Models can change model versions without notice) produce different extraction results.

**Consequences:**
- Index values jitter day-to-day with no real change in underlying compute capacity
- Trend lines show noise instead of signal, making the index useless for its stated purpose
- Users cannot distinguish real compute capacity changes from LLM extraction variance

**Prevention:**
- Implement input hashing: only re-extract when source content hash changes, not on every run
- Store extraction results as "resolved facts" in a persistent JSON store; new extractions are proposals that must be manually confirmed or must exceed a confidence threshold
- Use ensemble extraction (run same prompt 3 times, take majority vote) for critical data points — costs 3x calls but is worth it for index-significant values
- Pin model versions in API calls (e.g., `gpt-4o-mini-2024-07-18` not just `gpt-4o-mini`)
- Separate extraction into "stable facts" (CapEx numbers from SEC, energy data from OWID) vs. "volatile facts" (news-based estimates) with different confidence treatments

**Detection:** Run a daily "drift check" that re-extracts a known sample and compares to stored results. Alert if more than 20% of values differ.

**Phase to address:** Phase 2 (Data Pipeline). The extraction pipeline design must include idempotency and deduplication from day one.

---

### Pitfall 4: XBRL Parsing Failures on SEC EDGAR Data

**What goes wrong:** CapEx data extracted from SEC EDGAR XBRL filings contains wrong values, missing fields, or inconsistent taxonomy usage across companies. Companies create custom XBRL tags that deviate from the US-GAAP taxonomy. Sign errors (credit vs. debit) cause negative CapEx to appear where positive values are expected. Scaling errors (thousands vs. millions) cause order-of-magnitude jumps in index values.

**Why it happens:** XBRL is notoriously messy in practice. The SEC's Data Quality Committee publishes validation rules, but companies still file with errors. Custom taxonomy extensions, inconsistent tagging of "capital expenditure" across different accounting periods, and amended filings superseding earlier data all create parsing hazards.

**Consequences:**
- A single company's CapEx appearing 1000x too large or small due to unit misinterpretation
- Index spikes and drops that reflect data quality issues, not real compute capacity changes
- Loss of credibility when users spot obviously wrong numbers

**Prevention:**
- Implement sanity bounds: flag any CapEx value that is 10x the previous quarter or 100x the median for that company
- Cross-reference multiple XBRL tags for the same concept (e.g., `us-gaap:PaymentsToAcquirePropertyPlantAndEquipment` and `us-gaap:CapitalExpenditures`)
- Detect and handle amended filings (10-K/A, 10-Q/A) by checking filing dates
- Log raw XBRL values alongside normalized values for audit trail
- Use the SEC's DQC validation rules as a pre-processing filter

**Detection:** Daily comparison of new values against rolling 4-quarter median. Flag outliers for review. Display confidence score of 2 (LOW) for any value that exceeds sanity bounds.

**Phase to address:** Phase 2 (Data Pipeline). SEC EDGAR parsing is a dedicated data source module that needs its own validation layer.

---

## Moderate Pitfalls

### Pitfall 5: GitHub Pages SPA Routing Breaks Deep Links

**What goes wrong:** Users share a URL like `computeatlas.io/country/us` or bookmark a drill-down page. When they navigate to it directly (not via the SPA router), GitHub Pages returns a 404 because there is no actual `/country/us/index.html` file.

**Why it happens:** GitHub Pages is a static file server. It serves files at their literal path. SPAs need all routes to serve `index.html` and let client-side JavaScript handle routing.

**Prevention:**
- Copy `index.html` to `404.html` in the build output (the `spa-github-pages` trick). GitHub Pages serves `404.html` for any unknown path, which loads the SPA router that then handles the URL.
- Alternative: use hash-based routing (`#/country/us`) so the server always sees `/`. However, this produces uglier URLs and worse SEO.
- The `404.html` copy approach is better for this project because URLs like `computeatlas.io/country/us` look professional and shareable.

**Detection:** Test every deep link route in a staging deployment before launch. Create a link-checker CI step.

**Phase to address:** Phase 1 (Frontend Foundation). Routing architecture must be decided and tested before building pages.

---

### Pitfall 6: Visualization Performance Collapse with Dense Markers

**What goes wrong:** The heatmap and 3D globe views become choppy or freeze on mid-range hardware when rendering hundreds or thousands of data center markers. Mobile browsers (if ever targeted) crash entirely.

**Why it happens:** Naive rendering adds individual DOM or WebGL draw calls per data point. GeoJSON parsing for large feature sets is CPU-bound. Re-rendering entire layers on every React state change compounds the problem.

**Consequences:**
- Desktop users with integrated GPUs or older hardware cannot use the visualization
- The Bloomberg Terminal-inspired HUD aesthetic is ruined by frame drops
- 3D globe view is unusable with more than a few hundred markers

**Prevention:**
- Use deck.gl's instanced rendering layers (`ScatterplotLayer`, `IconLayer`) instead of individual markers
- Pre-aggregate data into grid cells (H3 hexagons or S2 cells) before rendering — this reduces point count by 10-100x while preserving geographic distribution
- Disable `pickable: false` on non-interactive layers to save GPU resources
- Use binary/typed-array data formats instead of GeoJSON for large datasets
- Implement viewport-based filtering: only render markers visible in the current camera frame
- Set `deck: { _pickable: false }` on heatmap layers
- Profile with Chrome DevTools Performance tab during development — target 60fps with the full dataset

**Detection:** Establish a performance benchmark: render the full MVP dataset (10 countries, 20 cities, 5 providers) and measure frame time. If above 16ms, optimize before adding more data.

**Phase to address:** Phase 3 (Visualization). But establish performance budgets in Phase 1 so early architecture choices don't paint into a corner.

---

### Pitfall 7: Stale Data Without Transparent Indicators

**What goes wrong:** The index shows yesterday's (or last week's) data as current. Users make decisions based on numbers that look fresh but are actually stale because a data fetch failed silently.

**Why it happens:** Scheduled workflow fails (Pitfall 1), but the frontend still shows the last successful data. No "last updated" timestamp is visible to the user. API sources change their response format or add new required parameters without notice (especially World Bank, OWID).

**Consequences:**
- Users trust the index as real-time when it is actually delayed
- Trend analysis based on mixed-frequency data produces misleading signals
- Credibility damage when users discover "current" data is weeks old

**Prevention:**
- Every data file must include a `lastUpdated` ISO timestamp and a `sources` array with per-source timestamps
- Frontend must prominently display data freshness (e.g., "Data as of 2026-05-06 12:00 UTC")
- Implement a "staleness gradient" — green (< 24h), yellow (24-72h), red (> 72h)
- Add automated staleness alerts via GitHub Issues when data exceeds 48h age
- All API fetch steps in Actions must validate response schema before committing data

**Detection:** Build a `/status` page showing per-source freshness. This also doubles as a debugging tool for contributors.

**Phase to address:** Phase 1 (Infrastructure) for the timestamp contract, Phase 2 (Data) for source-specific validation.

---

### Pitfall 8: GitHub Pages Cache Serving Stale Builds

**What goes wrong:** After deploying a new build to GitHub Pages, users still see the old version because the CDN caches assets with a 10-minute TTL. Users who recently visited the site get stale HTML/JS/CSS even after deployment completes.

**Why it happens:** GitHub Pages serves through a CDN with `Cache-Control: max-age=600` (10 minutes). You cannot override this header from the repository side. Browser caches compound the problem.

**Prevention:**
- Use content-hashed filenames for JS and CSS bundles (Vite does this by default: `app.a1b2c3d4.js`)
- The HTML file itself is the problem — users may get a cached `index.html` pointing to old JS/CSS. The `404.html` trick can help here since it is a different cache key.
- After deployment, do not expect instant propagation. Communicate that updates take up to 10 minutes.
- Add a build timestamp or git commit hash visible in the UI (e.g., "Build: abc123") so users can verify they have the latest version.
- For critical updates, consider adding a version-check mechanism: fetch a tiny `version.json` with a hash, and if it differs from what the JS knows, prompt a hard refresh.

**Detection:** After each deployment, check the live site within 1-2 minutes and again at 12 minutes. Automate this as a post-deploy verification step.

**Phase to address:** Phase 1 (Infrastructure). Cache-busting strategy must be part of the build pipeline from the start.

---

### Pitfall 9: OWID / World Bank Data Inconsistencies

**What goes wrong:** Energy data from OWID and World Bank has missing country entries, temporal gaps, definitional changes across years, and entity name inconsistencies (e.g., "Czechia" vs. "Czech Republic"). Merging these with cloud provider data that uses different geographic names produces silent join failures.

**Why it happens:** OWID aggregates from multiple upstream sources (World Bank, UN, IEA) which use different country codes and definitions. Small nations, disputed territories, and newly independent states are frequently missing. Methodology updates cause discontinuities in time series.

**Consequences:**
- Countries silently disappear from the index because their energy data is missing
- Time series show artificial jumps when OWID changes methodology
- Geographic drill-down breaks when country names don't match across data sources

**Prevention:**
- Use ISO 3166-1 alpha-3 codes as the canonical country identifier, not names. Maintain a mapping table from every source's naming convention to ISO codes.
- Build a "coverage matrix" showing which data sources have data for which countries/time periods. Display this on the `/status` page.
- Accept that some countries will have incomplete data. Show available data with explicit "N/A" rather than hiding the gap.
- Snapshot the OWID/World Bank data dictionaries at project start. Compare against new fetches to detect upstream changes.

**Detection:** Automated coverage check: count countries with data in each source per run. Alert if coverage drops by more than 5% from the previous run.

**Phase to address:** Phase 2 (Data Pipeline). Geographic mapping and coverage tracking must be part of the initial data model.

---

### Pitfall 10: GitHub Models Rate Limit Exhaustion Cascading Failures

**What goes wrong:** The 150 requests/day limit for GPT-4o-mini (Copilot Free tier) is hit mid-run, causing later extraction steps to fail. Partial data from the run is committed, creating an inconsistent state where some sources are updated and others are not.

**Why it happens:** With 4 runs/day and ~37 calls per run budget, there is zero margin for error. If a previous run fails partway and retries are not idempotent, the retry consumes duplicate calls. If a developer manually triggers a run for testing, it eats into the daily budget. Rate limits are per-user, not per-workflow, so manual API calls count against the same limit.

**Consequences:**
- Partial data updates create inconsistent index values (some sources fresh, some stale)
- Next day's first run has different baseline than expected
- Compound failures when retry logic consumes even more of the daily budget

**Prevention:**
- Implement strict per-run call budgeting with a counter that aborts the extraction pipeline before hitting limits
- Make all extraction steps idempotent: if source data hasn't changed, skip extraction (use content hashing)
- Add a pre-flight check at workflow start that queries remaining GitHub Models quota
- Design for partial success: if extraction fails for one source, commit what succeeded and mark the failed source as "extraction pending" in the data file
- Never manually test against the production GitHub Models quota — use a separate environment or mock responses

**Detection:** Log call count per run in the workflow summary. Alert when utilization exceeds 80% of budget.

**Phase to address:** Phase 2 (Data Pipeline). The extraction pipeline must have call budgeting as a first-class concept.

---

## Minor Pitfalls

### Pitfall 11: Export Control Classification Tables Going Stale

**What goes wrong:** The manual export control lookup table reflects regulations at project start but never gets updated. Regulators change rules (new entities added to restricted lists, new technology thresholds), making the risk analysis in the index misleading or legally problematic.

**Prevention:**
- Use LLM extraction to monitor Bureau of Industry and Security (BIS) Federal Register notices for changes
- Add a "regulation last reviewed" date prominently in the UI
- Keep export control data separate from the index calculation — it is informational overlay, not a weighting factor
- Include a disclaimer that the data is for informational purposes only and not legal advice

**Phase to address:** Phase 4 (Detail Pages). This is a UI/presentation concern that doesn't block the core index.

---

### Pitfall 12: Custom Domain HTTPS Certificate Renewal Failure

**What goes wrong:** If using a custom domain (e.g., `computeatlas.io`), GitHub's auto-provisioned Let's Encrypt certificate fails to renew because the DNS CNAME record was changed or the domain expired. The site becomes inaccessible over HTTPS.

**Prevention:**
- Set domain registration to auto-renew
- Add DNS monitoring that checks the CNAME/A records weekly
- Use GitHub's built-in "Enforce HTTPS" setting
- Document the required DNS configuration in the repo README for future maintainers

**Phase to address:** Phase 1 (Infrastructure) during initial setup, then ongoing monitoring.

---

### Pitfall 13: Repo Bloat from Committed Data Files

**What goes wrong:** Committing static JSON data files to the repository (the intended architecture) causes the repo to grow large over time. Git stores full snapshots of changed files, and if data files are large or change frequently, the `.git` directory grows to gigabytes, slowing clones and Actions checkouts.

**Prevention:**
- Keep data files minimal: use compact JSON (no pretty-printing for large files), compress where possible
- Use `git sparse-checkout` or `actions/checkout` with `sparse-checkout` for workflows that only need specific paths
- Consider a separate `data` branch for data files, keeping `main` clean for code
- If files exceed 50 MB each, consider Git LFS (but note GitHub's 1 GB bandwidth/month LFS limit on free plan)
- Periodically squash old data commits if history is not needed

**Phase to address:** Phase 1 (Infrastructure). Data file structure and git strategy must be decided upfront.

---

### Pitfall 14: Confidence Scoring Inflation

**What goes wrong:** The 1-5 confidence scoring system is implemented but ends up with most data points rated 3-4 ("medium-high") because developers are reluctant to label data as low-confidence. This makes the confidence score meaningless — it doesn't differentiate data quality.

**Prevention:**
- Define concrete, measurable criteria for each level (e.g., Level 5 = official API, verified against 2+ sources; Level 1 = single LLM extraction, unverified)
- Make confidence assignment automatic based on the data source layer (structured API = 5, RSS+rules = 3, LLM extraction = 2, manual = 4)
- Display the scoring criteria publicly so users can calibrate their trust
- Run a quarterly audit: if more than 50% of data points are at the same confidence level, the scale is not differentiating

**Phase to address:** Phase 2 (Data Pipeline). Scoring criteria must be defined alongside the data architecture.

---

### Pitfall 15: Browser WebGL Compatibility for 3D Globe

**What goes wrong:** The 3D globe view requires WebGL support which is not available on all browsers/devices. Older hardware, certain corporate environments with restricted drivers, and some mobile browsers fail silently — the globe just doesn't render, showing a blank area with no error message.

**Prevention:**
- Detect WebGL support at page load and fall back to the 2D map view if unavailable
- Show a clear message ("3D globe requires WebGL. Using 2D map view instead.") rather than a blank space
- Test on common configurations: Chrome/Firefox/Safari on desktop, plus at least one mobile browser
- Keep the 2D map as the primary view; make the 3D globe an enhancement, not a requirement

**Phase to address:** Phase 3 (Visualization). The globe is a differentiator feature, not table stakes.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Phase 1: Infrastructure | Actions cron unreliability (Pitfall 1) | Offset cron, add monitoring, staleness indicators |
| Phase 1: Infrastructure | Data storage strategy (Pitfall 2) | Commit to repo, not artifacts; minimal file sizes |
| Phase 1: Infrastructure | SPA routing 404s (Pitfall 5) | 404.html copy trick from day one |
| Phase 1: Infrastructure | Cache busting (Pitfall 8) | Content-hashed filenames, build stamp in UI |
| Phase 1: Infrastructure | Repo bloat (Pitfall 13) | Separate data branch, compact JSON, sparse checkout |
| Phase 2: Data Pipeline | LLM non-determinism (Pitfall 3) | Input hashing, ensemble extraction, pinned model versions |
| Phase 2: Data Pipeline | XBRL parsing errors (Pitfall 4) | Sanity bounds, cross-reference tags, audit trail |
| Phase 2: Data Pipeline | Source data inconsistencies (Pitfall 9) | ISO country codes, coverage matrix, explicit N/A |
| Phase 2: Data Pipeline | Rate limit exhaustion (Pitfall 10) | Per-run budgeting, idempotent extraction, pre-flight checks |
| Phase 2: Data Pipeline | Confidence score inflation (Pitfall 14) | Automatic scoring by source layer, public criteria |
| Phase 3: Visualization | Performance collapse (Pitfall 6) | deck.gl instanced rendering, H3 aggregation, viewport filtering |
| Phase 3: Visualization | WebGL fallback (Pitfall 15) | Detect and fall back to 2D, make globe optional |
| Phase 4: Detail Pages | Stale export control data (Pitfall 11) | LLM monitoring of BIS notices, disclaimer |
| All Phases | Stale data without indicators (Pitfall 7) | Per-source timestamps, staleness gradient, /status page |
| All Phases | Custom domain certificate (Pitfall 12) | Auto-renew, DNS monitoring |

## Sources

- GitHub Actions scheduled workflow docs: https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#schedule (verified 2026-05-06)
- GitHub Actions usage limits: https://docs.github.com/en/actions/reference/actions-limits (verified 2026-05-06)
- GitHub Actions billing: https://docs.github.com/en/billing/managing-billing-for-your-products/managing-billing-for-github-actions/about-billing-for-github-actions (verified 2026-05-06)
- GitHub Models rate limits: https://docs.github.com/en/github-models/prototyping-with-ai-models#rate-limits (verified 2026-05-06)
- GitHub Pages docs: https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages (verified 2026-05-06)
- SEC XBRL data quality: SEC Data Quality Committee (DQC) rules (training data, MEDIUM confidence)
- OWID data limitations: OWID GitHub repository documentation (training data, MEDIUM confidence)
- deck.gl performance optimization: vis.gl official documentation (training data, MEDIUM confidence)
- spa-github-pages: https://github.com/rafgraph/spa-github-pages (training data, MEDIUM confidence)
- GitHub Pages cache headers and custom domain: training data, MEDIUM confidence
