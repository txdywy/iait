import { EntityType } from '../../data/types';
import type { CompiledEntity, EntityCrossRef, LatestIndex } from '../../data/types';

type GeoJsonFeature = {
  type: 'Feature';
  properties?: Record<string, unknown> | null;
  geometry?: unknown;
  [key: string]: unknown;
};

type GeoJsonFeatureCollection<TFeature extends GeoJsonFeature = GeoJsonFeature> = {
  type: 'FeatureCollection';
  features: TFeature[];
  [key: string]: unknown;
};

const propertyKeys = [
  'ISO_A2',
  'ISO_A3',
  'iso_a2',
  'iso_a3',
  'ADM0_A3',
  'WB_A2',
  'WB_A3',
  'name',
  'NAME',
  'NAME_EN',
  'ADMIN',
] as const;

function normalize(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLowerCase();
}

function countryIndex(crossRef: EntityCrossRef) {
  const index = new Map<string, string>();

  Object.entries(crossRef.countries).forEach(([id, country]) => {
    [id, country.iso2, country.iso3, country.worldBankCode, country.owidName, country.name].forEach((key) => {
      const normalized = normalize(key);
      if (normalized) {
        index.set(normalized, id);
      }
    });
  });

  return index;
}

export function countryIdForFeature(feature: GeoJsonFeature, crossRef: EntityCrossRef) {
  const properties = feature.properties ?? {};
  const index = countryIndex(crossRef);

  for (const key of propertyKeys) {
    const match = index.get(normalize(properties[key]));
    if (match) {
      return match;
    }
  }

  return null;
}

function countrySignal(entity: CompiledEntity | undefined) {
  if (!entity || entity.type !== EntityType.COUNTRY || !Number.isFinite(entity.score) || entity.score <= 0) {
    return {
      score: 0,
      hasComputeSignal: false,
    };
  }

  return {
    score: entity.score,
    confidence: entity.confidence,
    dataCompleteness: entity.dataCompleteness,
    lastUpdated: entity.lastUpdated,
    hasComputeSignal: true,
  };
}

export function joinCountryScores<TFeature extends GeoJsonFeature>(
  geometry: GeoJsonFeatureCollection<TFeature>,
  crossRef: EntityCrossRef,
  latest: LatestIndex,
): GeoJsonFeatureCollection<TFeature> {
  return {
    ...geometry,
    features: geometry.features.map((feature) => {
      const computeAtlasId = countryIdForFeature(feature, crossRef);
      const signal = countrySignal(computeAtlasId ? latest.entities[computeAtlasId] : undefined);
      const properties = {
        ...(feature.properties ?? {}),
        ...signal,
        ...(computeAtlasId ? { computeAtlasId } : {}),
      };

      return {
        ...feature,
        properties,
      };
    }) as TFeature[],
  };
}
