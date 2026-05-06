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

  private computeTTM(facts: XBRLFact[]): number | null {
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
    const capex = latest.form === '10-K'
      ? Math.abs(latest.val)
      : sorted.slice(0, 4).reduce((sum, filing) => sum + Math.abs(filing.val), 0);

    if (capex < MIN_CAPEX || capex > MAX_CAPEX) {
      console.warn(`[sec-edgar-capex] TTM CapEx $${(capex / 1e9).toFixed(2)}B outside expected range`);
    }

    return capex;
  }

  private normalize(company: typeof COMPANIES[number], capex: number): NormalizedRecord {
    return {
      source: this.name,
      entity: {
        id: company.id,
        type: EntityType.COMPANY,
        name: company.name,
      },
      metric: 'ai-capex-ttm',
      value: capex,
      unit: 'USD',
      timestamp: new Date().toISOString(),
      confidence: 5,
    };
  }
}

export default new SecEdgarCapexScraper();
