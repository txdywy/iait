import fs from 'node:fs';
import path from 'node:path';
import type { Scraper, NormalizedRecord } from '../types.js';
import { DataSourceLayer, EntityType } from '../types.js';
import { fetchWithRetry } from '../fetch-with-retry.js';

const OWID_CSV_URL = 'https://raw.githubusercontent.com/owid/energy-data/master/owid-energy-data.csv';
const CROSSREF_PATH = path.resolve(import.meta.dirname, '../mappings/entity-crossref.json');

/** Build OWID country name -> entity ID mapping from entity-crossref.json (per D-04) */
function loadOwidMapping(): { owidToEntity: Record<string, string>; owidNames: string[] } {
  const crossref = JSON.parse(fs.readFileSync(CROSSREF_PATH, 'utf-8'));
  const owidToEntity: Record<string, string> = {};
  for (const [id, c] of Object.entries(crossref.countries)) {
    owidToEntity[(c as { owidName: string }).owidName] = id;
  }
  return { owidToEntity, owidNames: Object.keys(owidToEntity) };
}

const { owidToEntity: OWID_TO_ENTITY, owidNames: OWID_NAMES } = loadOwidMapping();

/** Metrics to extract from OWID CSV (per D-15) */
const METRICS = [
  { column: 'primary_energy_consumption', metric: 'primary-energy-consumption', unit: 'TWh' },
  { column: 'electricity_generation', metric: 'electricity-generation', unit: 'TWh' },
  { column: 'renewables_share_elec', metric: 'renewables-share-elec', unit: '%' },
] as const;

class OwidEnergyScraper implements Scraper {
  readonly name = 'owid-energy';
  readonly source = DataSourceLayer.STRUCTURED_API;

  async fetch(): Promise<NormalizedRecord[]> {
    const response = await fetchWithRetry(OWID_CSV_URL);
    const csv = await response.text();
    return this.parseCsv(csv);
  }

  private parseCsv(csv: string): NormalizedRecord[] {
    const lines = csv.split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    const countryIdx = headers.indexOf('country');
    const yearIdx = headers.indexOf('year');
    const metricIndices = METRICS.map(m => ({
      ...m,
      idx: headers.indexOf(m.column),
    }));

    if (countryIdx === -1 || yearIdx === -1) {
      console.warn('[owid-energy] Missing required columns in CSV header');
      return [];
    }

    // Collect most recent year per country per metric
    // Key: `${entityId}-${metric}`, Value: { record, year }
    const latestByCountryMetric = new Map<string, { record: NormalizedRecord; year: number }>();

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',');
      const country = cols[countryIdx]?.trim();
      const yearStr = cols[yearIdx]?.trim();

      if (!country || !OWID_NAMES.includes(country)) continue;
      if (!yearStr) continue;

      const year = parseInt(yearStr, 10);
      if (isNaN(year)) continue;

      const entityId = OWID_TO_ENTITY[country];

      for (const { idx, metric, unit } of metricIndices) {
        if (idx === -1) continue;
        const valueStr = cols[idx]?.trim();
        if (!valueStr || valueStr === '') continue;
        const value = parseFloat(valueStr);
        if (isNaN(value)) continue;

        const key = `${entityId}-${metric}`;
        const existing = latestByCountryMetric.get(key);
        if (!existing || year > existing.year) {
          latestByCountryMetric.set(key, {
            record: {
              source: this.name,
              entity: { id: entityId, type: EntityType.COUNTRY, name: country },
              metric,
              value,
              unit,
              timestamp: `${year}-01-01T00:00:00Z`,
              confidence: 5,
            },
            year,
          });
        }
      }
    }

    return Array.from(latestByCountryMetric.values()).map(v => v.record);
  }
}

export default new OwidEnergyScraper();
