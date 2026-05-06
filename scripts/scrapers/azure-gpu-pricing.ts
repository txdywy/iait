import type { Scraper, NormalizedRecord } from '../types.js';
import { DataSourceLayer, EntityType } from '../types.js';
import { fetchWithRetry } from '../fetch-with-retry.js';

const BASE_URL = 'https://prices.azure.com/api/retail/prices';

/** GPU instance family prefixes to filter for */
const GPU_PREFIXES = ['Standard_NC', 'Standard_ND', 'Standard_NV'];

interface AzurePriceItem {
  currencyCode: string;
  retailPrice: number;
  unitPrice: number;
  armRegionName: string;
  location: string;
  armSkuName: string;
  meterName: string;
  productName: string;
  skuName: string;
  serviceName: string;
  serviceFamily: string;
  unitOfMeasure: string;
  type: string;
  isPrimaryMeterRegion: boolean;
  effectiveStartDate: string;
}

interface AzureApiResponse {
  Items: AzurePriceItem[];
  NextPageLink: string | null;
  Count: number;
}

class AzureGpuPricingScraper implements Scraper {
  readonly name = 'azure-gpu-pricing';
  readonly source = DataSourceLayer.STRUCTURED_API;

  async fetch(): Promise<NormalizedRecord[]> {
    const records: NormalizedRecord[] = [];

    for (const prefix of GPU_PREFIXES) {
      const items = await this.fetchGpuFamily(prefix);
      for (const item of items) {
        const record = this.normalize(item);
        if (record) records.push(record);
      }
    }

    return records;
  }

  private async fetchGpuFamily(prefix: string): Promise<AzurePriceItem[]> {
    const allItems: AzurePriceItem[] = [];
    let nextUrl: string | null =
      `${BASE_URL}?$filter=serviceName eq 'Virtual Machines' and priceType eq 'Consumption' and contains(armSkuName, '${prefix}')`;

    do {
      const response = await fetchWithRetry(nextUrl, {}, { baseDelayMs: 100 });
      const data = (await response.json()) as AzureApiResponse;

      if (Array.isArray(data.Items)) {
        allItems.push(...data.Items);
      }

      nextUrl = data.NextPageLink ?? null;
    } while (nextUrl);

    return allItems;
  }

  private normalize(item: AzurePriceItem): NormalizedRecord | null {
    // Only include primary meter region to avoid duplicates
    if (!item.isPrimaryMeterRegion) return null;

    // Guard against missing required fields
    if (!item.armRegionName || item.retailPrice == null || !item.effectiveStartDate) return null;

    // Guard against non-finite prices (T-02-04)
    if (!Number.isFinite(item.retailPrice)) return null;

    const timestampMs = Date.parse(item.effectiveStartDate);
    if (!Number.isFinite(timestampMs)) return null;

    return {
      source: this.name,
      entity: {
        id: `azure-${item.armRegionName}`,
        type: EntityType.CLOUD_REGION,
        name: item.location || item.armRegionName,
      },
      metric: 'gpu-price-hr',
      value: item.retailPrice,
      unit: 'USD/hr',
      timestamp: new Date(timestampMs).toISOString(),
      confidence: 5, // structured_api per D-07
    };
  }
}

export default new AzureGpuPricingScraper();
