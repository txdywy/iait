import { describe, expect, it } from 'vitest';
import { EntityType } from '../../data/types';
import type { EntityCrossRef, LatestIndex } from '../../data/types';
import { countryIdForFeature, joinCountryScores, topologyToCountryCollection } from './country-join';

const crossRef: EntityCrossRef = {
  countries: {
    us: {
      iso2: 'US',
      iso3: 'USA',
      worldBankCode: 'USA',
      owidName: 'United States',
      name: 'United States',
    },
  },
  cloudRegions: {},
  cities: {},
  companies: {},
};

const latest: LatestIndex = {
  generated: '2026-05-07T00:00:00Z',
  entities: {
    us: {
      type: EntityType.COUNTRY,
      name: 'United States',
      score: 87.5,
      factors: {},
      confidence: 4,
      lastUpdated: '2026-05-07T00:00:00Z',
      dataCompleteness: 'partial',
    },
  },
};

function feature(properties: Record<string, unknown>) {
  return {
    type: 'Feature' as const,
    properties,
    geometry: null,
  };
}

describe('country score joining', () => {
  it('maps ISO_A2, ISO_A3, and country names to ComputeAtlas country ids', () => {
    expect(countryIdForFeature(feature({ ISO_A2: 'US' }), crossRef)).toBe('us');
    expect(countryIdForFeature(feature({ ISO_A3: 'USA' }), crossRef)).toBe('us');
    expect(countryIdForFeature(feature({ name: 'United States' }), crossRef)).toBe('us');
  });

  it('copies score, confidence, and completeness properties onto matched country features', () => {
    const joined = joinCountryScores(
      {
        type: 'FeatureCollection',
        features: [feature({ ISO_A2: 'US' })],
      },
      crossRef,
      latest,
    );

    expect(joined.features[0].properties).toMatchObject({
      computeAtlasId: 'us',
      score: 87.5,
      confidence: 4,
      dataCompleteness: 'partial',
      hasComputeSignal: true,
    });
  });

  it('defaults unknown countries to zero score and no compute signal without crashing', () => {
    const joined = joinCountryScores(
      {
        type: 'FeatureCollection',
        features: [feature({ ISO_A2: 'AQ', name: 'Antarctica' })],
      },
      crossRef,
      latest,
    );

    expect(joined.features[0].properties).toMatchObject({
      score: 0,
      hasComputeSignal: false,
    });
    expect(joined.features[0].properties?.computeAtlasId).toBeUndefined();
  });

  it('converts world-atlas TopoJSON into joinable country GeoJSON', () => {
    const countries = topologyToCountryCollection({
      type: 'Topology',
      objects: {
        countries: {
          type: 'GeometryCollection',
          geometries: [
            { type: 'Polygon', arcs: [], properties: { ISO_A2: 'US' } },
          ],
        },
      },
      arcs: [],
    });

    const joined = joinCountryScores(countries, crossRef, latest);

    expect(joined.features[0].properties).toMatchObject({
      computeAtlasId: 'us',
      score: 87.5,
      hasComputeSignal: true,
    });
  });
});
