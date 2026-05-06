import type { Scraper, NormalizedRecord } from '../types.js';
import { DataSourceLayer, EntityType } from '../types.js';
import { signRequest } from './aws-signature-v4.js';

const GPU_FAMILIES = ['p4d', 'p5', 'g5', 'g6', 'trn', 'inf'];
const PRICING_API = 'https://pricing.us-east-1.amazonaws.com';

const AWS_CREDENTIALS = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
};

interface PricingProduct {
  product?: {
    productFamily?: string;
    attributes?: {
      instanceType?: string;
      instanceFamily?: string;
      location?: string;
      locationType?: string;
      operatingSystem?: string;
      vcpu?: string;
      memory?: string;
      gpuMemory?: string;
    };
  };
  terms?: {
    OnDemand?: Record<
      string,
      {
        priceDimensions?: Record<
          string,
          {
            unit?: string;
            pricePerUnit?: { USD?: string };
          }
        >;
      }
    >;
  };
}

interface PricingApiResponse {
  FormatVersion?: string;
  PriceList?: string[];
  NextToken?: string | null;
}

class AwsGpuPricingScraper implements Scraper {
  readonly name = 'aws-gpu-pricing';
  readonly source = DataSourceLayer.STRUCTURED_API;

  async fetch(): Promise<NormalizedRecord[]> {
    const records: NormalizedRecord[] = [];

    for (const family of GPU_FAMILIES) {
      const products = await this.fetchFamily(family);
      for (const product of products) {
        const record = this.normalize(product);
        if (record) records.push(record);
      }
    }

    return records;
  }

  private async fetchFamily(family: string): Promise<PricingProduct[]> {
    const allProducts: PricingProduct[] = [];
    let nextToken: string | undefined;

    do {
      const params = new URLSearchParams({
        ServiceCode: 'AmazonEC2',
        FormatVersion: 'aws_v1',
        MaxResults: '100',
      });

      const filters = [
        {
          Type: 'TERM_MATCH',
          Field: 'instanceFamily',
          Value: `${family} instance`,
        },
        { Type: 'TERM_MATCH', Field: 'operatingSystem', Value: 'Linux' },
        { Type: 'TERM_MATCH', Field: 'tenancy', Value: 'Shared' },
        { Type: 'TERM_MATCH', Field: 'capacitystatus', Value: 'Used' },
      ];

      filters.forEach((f, i) => {
        params.set(`Filters.${i + 1}.Type`, f.Type);
        params.set(`Filters.${i + 1}.Field`, f.Field);
        params.set(`Filters.${i + 1}.Value`, f.Value);
      });

      if (nextToken) {
        params.set('NextToken', nextToken);
      }

      const url = `${PRICING_API}/?${params}`;
      const headers = signRequest('GET', url, AWS_CREDENTIALS);

      const response = await fetch(url, { headers });

      if (!response.ok) {
        throw new Error(
          `AWS Pricing API returned ${response.status}: ${response.statusText}`,
        );
      }

      const data = (await response.json()) as PricingApiResponse;

      // PriceList items are JSON strings, not objects -- AWS pitfall
      if (data.PriceList) {
        for (const item of data.PriceList) {
          try {
            allProducts.push(JSON.parse(item) as PricingProduct);
          } catch {
            // Skip malformed PriceList items (ASVS V5 input validation)
          }
        }
      }

      nextToken = data.NextToken ?? undefined;
    } while (nextToken);

    return allProducts;
  }

  private normalize(product: PricingProduct): NormalizedRecord | null {
    const attrs = product.product?.attributes;
    if (!attrs?.instanceType || !attrs?.location) return null;

    const price = this.extractOnDemandPrice(product);
    if (price === null) return null;

    return {
      source: this.name,
      entity: {
        id: `aws-${attrs.location
          .toLowerCase()
          .replace(/[().]/g, '')
          .replace(/\s+/g, '-')}`,
        type: EntityType.CLOUD_REGION,
        name: attrs.location,
      },
      metric: 'gpu-price-hr',
      value: price,
      unit: 'USD/hr',
      timestamp: new Date().toISOString(),
      confidence: 5,
    };
  }

  private extractOnDemandPrice(product: PricingProduct): number | null {
    const onDemand = product.terms?.OnDemand;
    if (!onDemand) return null;

    for (const offer of Object.values(onDemand)) {
      const dims = offer.priceDimensions;
      if (!dims) continue;

      for (const dim of Object.values(dims)) {
        const priceStr = dim.pricePerUnit?.USD;
        if (priceStr) return parseFloat(priceStr);
      }
    }

    return null;
  }
}

export default new AwsGpuPricingScraper();
