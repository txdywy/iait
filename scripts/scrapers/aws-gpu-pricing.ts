import type { Scraper, NormalizedRecord } from '../types.js';
import { DataSourceLayer, EntityType } from '../types.js';
import { fetchWithRetry } from '../fetch-with-retry.js';

const REGION_OFFERS = [
  { region: 'us-east-1', entityId: 'aws-us-east-1', name: 'US East (N. Virginia)' },
  { region: 'us-west-2', entityId: 'aws-us-west-2', name: 'US West (Oregon)' },
  { region: 'eu-west-1', entityId: 'aws-eu-west-1', name: 'EU (Ireland)' },
  { region: 'eu-central-1', entityId: 'aws-eu-central-1', name: 'EU (Frankfurt)' },
  { region: 'ap-northeast-1', entityId: 'aws-ap-northeast-1', name: 'Asia Pacific (Tokyo)' },
  { region: 'ap-southeast-1', entityId: 'aws-ap-southeast-1', name: 'Asia Pacific (Singapore)' },
  { region: 'sa-east-1', entityId: 'aws-sa-east-1', name: 'South America (Sao Paulo)' },
] as const;

const GPU_FAMILIES = ['p4d', 'p5', 'g5', 'g6', 'trn', 'inf'];
const OFFER_BASE_URL = 'https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonEC2/current';

interface OfferProduct {
  sku: string;
  productFamily?: string;
  attributes?: {
    instanceType?: string;
    instanceFamily?: string;
    operatingSystem?: string;
    location?: string;
    tenancy?: string;
    capacitystatus?: string;
  };
}

interface OfferTerm {
  priceDimensions?: Record<string, {
    unit?: string;
    pricePerUnit?: { USD?: string };
  }>;
}

interface RegionOfferResponse {
  products?: Record<string, OfferProduct>;
  terms?: {
    OnDemand?: Record<string, Record<string, OfferTerm>>;
  };
  publicationDate?: string;
}

class AwsGpuPricingScraper implements Scraper {
  readonly name = 'aws-gpu-pricing';
  readonly source = DataSourceLayer.STRUCTURED_API;

  async fetch(): Promise<NormalizedRecord[]> {
    const records: NormalizedRecord[] = [];

    for (const region of REGION_OFFERS) {
      const offer = await this.fetchRegion(region.region);
      records.push(...this.normalizeRegion(offer, region));
    }

    return records;
  }

  private async fetchRegion(region: string): Promise<RegionOfferResponse> {
    const response = await fetchWithRetry(`${OFFER_BASE_URL}/${region}/index.json`);
    return await response.json() as RegionOfferResponse;
  }

  private normalizeRegion(
    offer: RegionOfferResponse,
    region: typeof REGION_OFFERS[number],
  ): NormalizedRecord[] {
    const records: NormalizedRecord[] = [];

    for (const product of Object.values(offer.products ?? {})) {
      if (!this.isGpuLinuxOnDemandProduct(product)) continue;

      const price = this.extractOnDemandPrice(offer, product.sku);
      if (price === null) continue;

      records.push({
        source: this.name,
        entity: {
          id: region.entityId,
          type: EntityType.CLOUD_REGION,
          name: product.attributes?.location ?? region.name,
        },
        metric: 'gpu-price-hr',
        value: price,
        unit: 'USD/hr',
        timestamp: offer.publicationDate ?? new Date().toISOString(),
        confidence: 5,
      });
    }

    return records;
  }

  private isGpuLinuxOnDemandProduct(product: OfferProduct): boolean {
    const attrs = product.attributes;
    if (!attrs?.instanceType) return false;
    if (attrs.operatingSystem !== 'Linux') return false;
    if (attrs.tenancy && attrs.tenancy !== 'Shared') return false;
    if (attrs.capacitystatus && attrs.capacitystatus !== 'Used') return false;

    return GPU_FAMILIES.some(family => attrs.instanceType!.startsWith(family));
  }

  private extractOnDemandPrice(offer: RegionOfferResponse, sku: string): number | null {
    const termsBySku = offer.terms?.OnDemand?.[sku];
    if (!termsBySku) return null;

    for (const term of Object.values(termsBySku)) {
      for (const dimension of Object.values(term.priceDimensions ?? {})) {
        const price = Number.parseFloat(dimension.pricePerUnit?.USD ?? '');
        if (dimension.unit === 'Hrs' && Number.isFinite(price)) return price;
      }
    }

    return null;
  }
}

export default new AwsGpuPricingScraper();
