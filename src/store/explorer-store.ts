import { create } from 'zustand';
import { EntityType } from '../data/types';
import type { EntityLevel } from '../data/types';

export type RankingScope = EntityType.COUNTRY | EntityType.CITY | EntityType.CLOUD_REGION;

export type ViewportIntent =
  | { type: 'global'; id?: undefined }
  | { type: 'fit-country'; id: string }
  | { type: 'focus-entity'; id: string };

interface ExplorerState {
  level: EntityLevel;
  selectedId: string | null;
  hoveredId: string | null;
  rankingScope: RankingScope;
  viewportIntent: ViewportIntent;
  setSelection: (level: EntityLevel, selectedId: string | null) => void;
  setHoveredId: (hoveredId: string | null) => void;
  setRankingScope: (rankingScope: RankingScope) => void;
  setViewportIntent: (viewportIntent: ViewportIntent) => void;
}

export const useExplorerStore = create<ExplorerState>((set) => ({
  level: EntityType.COUNTRY,
  selectedId: null,
  hoveredId: null,
  rankingScope: EntityType.COUNTRY,
  viewportIntent: { type: 'global' },
  setSelection: (level, selectedId) => set({ level, selectedId }),
  setHoveredId: (hoveredId) => set({ hoveredId }),
  setRankingScope: (rankingScope) => set({ rankingScope }),
  setViewportIntent: (viewportIntent) => set({ viewportIntent }),
}));
