import { EntityType } from '../../data/types';
import type { DerivedClusterNode, EntityCrossRef, EntityLevel, LatestIndex } from '../../data/types';

export type DrilldownChild =
  | {
      id: string;
      level: EntityType.COUNTRY | EntityType.CITY | EntityType.CLOUD_REGION | EntityType.COMPANY;
      label: string;
      description?: string;
      country?: string;
      city?: string;
      provider?: string;
      score?: number;
      confidence?: number;
    }
  | DerivedClusterNode;

export interface CompanyOverlay {
  id: string;
  level: EntityType.COMPANY;
  label: string;
  country: string;
  description: string;
}

function entityMetrics(id: string, latest: LatestIndex) {
  const entity = latest.entities[id];

  return entity
    ? {
        score: entity.score,
        confidence: entity.confidence,
      }
    : {};
}

export function deriveClusterNodes(crossRef: EntityCrossRef): DerivedClusterNode[] {
  return Object.entries(crossRef.cloudRegions).map(([cloudRegionId, region]) => ({
    id: `${cloudRegionId}-cluster`,
    level: 'data-center-cluster',
    parentCloudRegionId: cloudRegionId,
    provider: region.provider,
    country: region.country,
    city: region.city,
    label: `${region.provider.toUpperCase()} ${region.city} data center cluster`,
    description: `${region.provider.toUpperCase()} ${region.city} modeled cluster proxy derived from cloud-region presence; not a verified facility or exact data-center location.`,
  }));
}

export function resolveClusterDetail(clusterId: string, crossRef: EntityCrossRef) {
  return deriveClusterNodes(crossRef).find((cluster) => cluster.id === clusterId) ?? null;
}

function countryChildren(id: string, crossRef: EntityCrossRef, latest: LatestIndex): DrilldownChild[] {
  const cities = Object.entries(crossRef.cities)
    .filter(([, city]) => city.country === id)
    .map(([cityId, city]) => ({
      id: cityId,
      level: EntityType.CITY,
      label: city.name,
      country: city.country,
      ...entityMetrics(cityId, latest),
    }));

  const cloudRegions = Object.entries(crossRef.cloudRegions)
    .filter(([, region]) => region.country === id)
    .map(([regionId, region]) => ({
      id: regionId,
      level: EntityType.CLOUD_REGION,
      label: regionId,
      country: region.country,
      city: region.city,
      provider: region.provider,
      ...entityMetrics(regionId, latest),
    }));

  const companies = Object.entries(crossRef.companies)
    .filter(([, company]) => company.country === id)
    .map(([companyId, company]) => ({
      id: companyId,
      level: EntityType.COMPANY,
      label: company.name,
      country: company.country,
      description: 'AI CapEx signal; not an exact facility location.',
      ...entityMetrics(companyId, latest),
    }));

  return [...cities, ...cloudRegions, ...companies];
}

function cityChildren(id: string, crossRef: EntityCrossRef, latest: LatestIndex): DrilldownChild[] {
  return Object.entries(crossRef.cloudRegions)
    .filter(([, region]) => region.city === id)
    .map(([regionId, region]) => ({
      id: regionId,
      level: EntityType.CLOUD_REGION,
      label: regionId,
      country: region.country,
      city: region.city,
      provider: region.provider,
      ...entityMetrics(regionId, latest),
    }));
}

export function childrenForSelection(
  level: EntityLevel,
  id: string | null,
  crossRef: EntityCrossRef,
  latest: LatestIndex,
): DrilldownChild[] {
  if (!id) {
    return [];
  }

  switch (level) {
    case EntityType.COUNTRY:
      return countryChildren(id, crossRef, latest);
    case EntityType.CITY:
      return cityChildren(id, crossRef, latest);
    case EntityType.CLOUD_REGION:
      return deriveClusterNodes(crossRef).filter((cluster) => cluster.parentCloudRegionId === id);
    case EntityType.COMPANY:
    case 'data-center-cluster':
      return [];
    default:
      return [];
  }
}

export function companyOverlays(crossRef: EntityCrossRef): CompanyOverlay[] {
  return Object.entries(crossRef.companies).map(([id, company]) => ({
    id,
    level: EntityType.COMPANY,
    label: `${company.name} corporate compute influence`,
    country: company.country,
    description: `${company.name} AI CapEx signal; not an exact facility location.`,
  }));
}
