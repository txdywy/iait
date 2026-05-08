import { useQuery } from '@tanstack/react-query';
import { fetchStaticJson } from './static-json';
import type {
  EntityCrossRef,
  EntityFile,
  EntityType,
  HistoryIndex,
  IndexConfig,
  LatestIndex,
  RankingsIndex,
} from './types';

export interface EntitySourceSummary {
  available: boolean;
  state: 'available' | 'unavailable';
  sources: EntityFile['series'];
}

export const staticDataPaths = {
  latest: 'data/latest.json',
  rankings: 'data/rankings.json',
  history: 'data/history.json',
  indexConfig: 'data/index-config.json',
  crossRef: 'data/entity-crossref.json',
  countryGeometry: 'data/geo/countries-110m.json',
  entitySourceSummary: (type: EntityType, id: string) => `data/entities/${type}/${id}.json`,
} as const;

export const queryKeys = {
  latest: ['data', staticDataPaths.latest] as const,
  rankings: ['data', staticDataPaths.rankings] as const,
  history: ['data', staticDataPaths.history] as const,
  indexConfig: ['data', staticDataPaths.indexConfig] as const,
  crossRef: ['data', staticDataPaths.crossRef] as const,
  countryGeometry: ['data', staticDataPaths.countryGeometry] as const,
  entitySourceSummary: (type: EntityType, id: string) => [
    'data',
    staticDataPaths.entitySourceSummary(type, id),
  ] as const,
} as const;

export function useLatestIndex() {
  return useQuery({
    queryKey: queryKeys.latest,
    queryFn: () => fetchStaticJson<LatestIndex>(staticDataPaths.latest),
  });
}

export function useRankings() {
  return useQuery({
    queryKey: queryKeys.rankings,
    queryFn: () => fetchStaticJson<RankingsIndex>(staticDataPaths.rankings),
  });
}

export function useHistory() {
  return useQuery({
    queryKey: queryKeys.history,
    queryFn: () => fetchStaticJson<HistoryIndex>(staticDataPaths.history),
  });
}

export function useIndexConfig() {
  return useQuery({
    queryKey: queryKeys.indexConfig,
    queryFn: () => fetchStaticJson<IndexConfig>(staticDataPaths.indexConfig),
  });
}

export function useCrossRef() {
  return useQuery({
    queryKey: queryKeys.crossRef,
    queryFn: () => fetchStaticJson<EntityCrossRef>(staticDataPaths.crossRef),
  });
}

export function useCountryGeometry<TGeometry = unknown>() {
  return useQuery({
    queryKey: queryKeys.countryGeometry,
    queryFn: () => fetchStaticJson<TGeometry>(staticDataPaths.countryGeometry),
  });
}

export function useEntitySourceSummary(type: EntityType, id: string) {
  const path = staticDataPaths.entitySourceSummary(type, id);

  return useQuery({
    queryKey: queryKeys.entitySourceSummary(type, id),
    queryFn: async (): Promise<EntitySourceSummary> => {
      try {
        const entity = await fetchStaticJson<EntityFile>(path);

        return {
          available: true,
          state: 'available',
          sources: entity.series,
        };
      } catch (err) {
        if (err instanceof Error && err.message === `Failed to load ${path}: 404`) {
          return {
            available: false,
            state: 'unavailable',
            sources: [],
          };
        }

        throw err;
      }
    },
  });
}
