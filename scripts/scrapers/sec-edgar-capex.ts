import type { Scraper, NormalizedRecord } from '../types.js';
import { DataSourceLayer, EntityType } from '../types.js';
import { fetchWithRetry } from '../fetch-with-retry.js';

const BASE_URL = 'https://data.sec.gov/api/xbrl/companyconcept';
const XBRL_TAG = 'PaymentsToAcquirePropertyPlantAndEquipment';
const MIN_CAPEX = 100_000_000;
const MAX_CAPEX = 100_000_000_000;

const COMPANIES = [
  { id: 'nvidia', cik: '0001045810', name: 'NVIDIA' },
  { id: 'microsoft', cik: '0000789019', name: 'Microsoft' },
  { id: 'alphabet', cik: '0001652044', name: 'Alphabet/Google' },
  { id: 'amazon', cik: '0001018724', name: 'Amazon' },
  { id: 'meta', cik: '0001326801', name: 'Meta' },
] as const;

interface XBRLFact {
  end: string;
  val: number;
  form: string;
  filed: string;
  fp?: string;
  fy?: number;
}

interface CompanyConceptResponse {
  units?: {
    USD?: XBRLFact[];
  };
}

class SecEdgarCapexScraper implements Scraper {
  readonly name = 'sec-edgar-capex';
  readonly source = DataSourceLayer.STRUCTURED_API;

  async fetch(): Promise<NormalizedRecord[]> {
    const records: NormalizedRecord[] = [];

    for (const company of COMPANIES) {
      try {
        const facts = await this.fetchCompany(company.cik);
        const capex = this.computeTTM(facts);
        if (capex !== null) {
          records.push(this.normalize(company, capex));
        }
      } catch (err) {
        console.error(`[sec-edgar-capex] Failed to fetch ${company.name}: ${err}`);
      }
    }

    return records;
  }

  private async fetchCompany(cik: string): Promise<XBRLFact[]> {
    const email = process.env.SEC_EDGAR_EMAIL ?? 'contact@example.com';
    const response = await fetchWithRetry(
      `${BASE_URL}/CIK${cik}/us-gaap/${XBRL_TAG}.json`,
      { headers: { 'User-Agent': `ComputeAtlas/0.1.0 (${email})` } },
      { baseDelayMs: 100 },
    );
    const data = (await response.json()) as CompanyConceptResponse;
    return data.units?.USD ?? [];
  }

  private computeTTM(facts: XBRLFact[]): { value: number; timestamp: string } | null {
    const filings = facts.filter(f =>
      (f.form === '10-K' || f.form === '10-Q') && Number.isFinite(f.val),
    );
    if (filings.length === 0) return null;

    const byPeriod = new Map<string, XBRLFact>();
    for (const filing of filings) {
      const existing = byPeriod.get(filing.end);
      if (!existing || filing.filed > existing.filed) {
        byPeriod.set(filing.end, filing);
      }
    }

    const sorted = Array.from(byPeriod.values()).sort((a, b) => b.end.localeCompare(a.end));
    const latest = sorted[0];
    const latestAnnual = sorted.find(filing => filing.form === '10-K');

    if (latest.form === '10-K') {
      return this.capexResult(Math.abs(latest.val), latest.end);
    }

    const ttm = this.computeQuarterlyTTM(sorted.filter(filing => filing.form === '10-Q'));
    if (ttm) return ttm;
    if (!latestAnnual) return null;

    return this.capexResult(Math.abs(latestAnnual.val), latestAnnual.end);
  }

  private computeQuarterlyTTM(facts: XBRLFact[]): { value: number; timestamp: string } | null {
    const byFiscalYear = new Map<number, XBRLFact[]>();
    for (const fact of facts) {
      if (fact.fy === undefined) continue;
      const yearFacts = byFiscalYear.get(fact.fy) ?? [];
      yearFacts.push(fact);
      byFiscalYear.set(fact.fy, yearFacts);
    }

    const standalone: Array<{ value: number; end: string }> = [];
    for (const yearFacts of byFiscalYear.values()) {
      const sortedYearFacts = yearFacts.sort((a, b) => a.end.localeCompare(b.end));
      let previousYtd = 0;
      for (const fact of sortedYearFacts) {
        const value = Math.abs(fact.val) - previousYtd;
        if (value < 0) return null;
        standalone.push({ value, end: fact.end });
        previousYtd = Math.abs(fact.val);
      }
    }

    const latestQuarters = standalone.sort((a, b) => b.end.localeCompare(a.end)).slice(0, 4);
    if (latestQuarters.length < 4) return null;

    return this.capexResult(
      latestQuarters.reduce((sum, quarter) => sum + quarter.value, 0),
      latestQuarters[0].end,
    );
  }

  private capexResult(value: number, end: string): { value: number; timestamp: string } {
    if (value < MIN_CAPEX || value > MAX_CAPEX) {
      console.warn(`[sec-edgar-capex] TTM CapEx $${(value / 1e9).toFixed(2)}B outside expected range`);
    }

    return { value, timestamp: `${end}T00:00:00Z` };
  }

  private normalize(
    company: typeof COMPANIES[number],
    capex: { value: number; timestamp: string },
  ): NormalizedRecord {
    return {
      source: this.name,
      entity: {
        id: company.id,
        type: EntityType.COMPANY,
        name: company.name,
      },
      metric: 'ai-capex-ttm',
      value: capex.value,
      unit: 'USD',
      timestamp: capex.timestamp,
      confidence: 5,
    };
  }
}

export default new SecEdgarCapexScraper();
