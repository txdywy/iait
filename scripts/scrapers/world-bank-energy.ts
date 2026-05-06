import fs from 'node:fs';
import path from 'node:path';
import type { Scraper, NormalizedRecord } from '../types.js';
import { DataSourceLayer, EntityType } from '../types.js';
import { fetchWithRetry } from '../fetch-with-retry.js';

const BASE_URL = 'https://api.worldbank.org/v2';
const CROSSREF_PATH = path.resolve(import.meta.dirname, '../mappings/entity-crossref.json');

interface CountryCrossRef {
  iso3: string;
  name: string;
}

function loadWorldBankMapping(): {
  countryCodes: string;
  iso3ToEntity: Record<string, string>;
  iso3ToName: Record<string, string>;
} {
  const crossref = JSON.parse(fs.readFileSync(CROSSREF_PATH, 'utf-8')) as {
    countries: Record<string, CountryCrossRef>;
  };
  const iso3ToEntity: Record<string, string> = {};
  const iso3ToName: Record<string, string> = {};

  for (const [id, country] of Object.entries(crossref.countries)) {
    iso3ToEntity[country.iso3] = id;
    iso3ToName[country.iso3] = country.name;
  }

  return {
    countryCodes: Object.keys(iso3ToEntity).join(';'),
    iso3ToEntity,
    iso3ToName,
  };
}

const {
  countryCodes: COUNTRY_CODES,
  iso3ToEntity: ISO3_TO_ENTITY,
  iso3ToName: ISO3_TO_NAME,
} = loadWorldBankMapping();

const INDICATORS = [
  { code: 'EG.USE.ELEC.KH.PC', metric: 'electricity-per-capita', unit: 'kWh' },
  { code: 'EG.ELC.PROD.KH', metric: 'electricity-production', unit: 'kWh' },
] as const;

interface WorldBankItem {
  country: { id: string; value: string };
  countryiso3code: string;
  date: string;
  value: number | null;
}

class WorldBankEnergyScraper implements Scraper {
  readonly name = 'world-bank-energy';
  readonly source = DataSourceLayer.STRUCTURED_API;

  async fetch(): Promise<NormalizedRecord[]> {
    const records: NormalizedRecord[] = [];

    for (const indicator of INDICATORS) {
      records.push(...await this.fetchIndicator(indicator));
    }

    return records;
  }

  private async fetchIndicator(
    indicator: typeof INDICATORS[number],
  ): Promise<NormalizedRecord[]> {
    const url = `${BASE_URL}/country/${COUNTRY_CODES}/indicator/${indicator.code}?format=json&per_page=1000&mrnev=1`;
    const response = await fetchWithRetry(url);
    const json = await response.json();

    if (!Array.isArray(json) || json.length < 2 || !Array.isArray(json[1])) {
      console.warn(`[world-bank-energy] Unexpected response structure for ${indicator.code}`);
      return [];
    }

    const records: NormalizedRecord[] = [];
    for (const item of json[1] as WorldBankItem[]) {
      if (item.value === null || item.value === undefined) continue;

      const entityId = ISO3_TO_ENTITY[item.countryiso3code];
      if (!entityId || !Number.isFinite(item.value)) continue;

      records.push({
        source: this.name,
        entity: {
          id: entityId,
          type: EntityType.COUNTRY,
          name: ISO3_TO_NAME[item.countryiso3code] ?? item.country.value,
        },
        metric: indicator.metric,
        value: item.value,
        unit: indicator.unit,
        timestamp: `${item.date}-01-01T00:00:00Z`,
        confidence: 5,
      });
    }

    return records;
  }
}

export default new WorldBankEnergyScraper();
