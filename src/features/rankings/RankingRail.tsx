import { useMemo, useState } from 'react';
import { useLatestIndex, useRankings } from '../../data/queries';
import { EntityType } from '../../data/types';
import type { RankingEntry } from '../../data/types';
import { CompletenessBadge, ConfidenceBadge, FreshnessBadge } from '../../components/StatusBadges';
import { EmptyState, ErrorState, LoadingState } from '../../components/LoadingState';

interface RankingRailProps {
  onSelect?: (type: EntityType, id: string) => void;
}

interface RankingScope {
  label: string;
  key: 'countries' | 'cities' | 'cloudRegions';
  type: EntityType;
}

const scopes: RankingScope[] = [
  { label: 'Countries', key: 'countries', type: EntityType.COUNTRY },
  { label: 'Cities', key: 'cities', type: EntityType.CITY },
  { label: 'Cloud Regions', key: 'cloudRegions', type: EntityType.CLOUD_REGION },
];

function getScore(entry: RankingEntry) {
  return Number.isFinite(entry.score) ? entry.score : Number.NEGATIVE_INFINITY;
}

export function RankingRail({ onSelect }: RankingRailProps) {
  const rankings = useRankings();
  const latest = useLatestIndex();
  const [activeScope, setActiveScope] = useState<RankingScope>(scopes[0]);

  const rows = useMemo(() => {
    const entries = rankings.data?.byType[activeScope.key] ?? [];

    return [...entries]
      .filter((entry) => Number.isFinite(entry.score) && !(entry.score <= 0))
      .sort((a, b) => getScore(b) - getScore(a));
  }, [activeScope.key, rankings.data?.byType]);

  if (rankings.isLoading || latest.isLoading) {
    return <LoadingState />;
  }

  if (rankings.isError || latest.isError) {
    return <ErrorState />;
  }

  return (
    <section className="flex h-full flex-col font-mono" aria-label="Compute index rankings">
      <div>
        <p className="text-xs uppercase tracking-[0.08em] text-[var(--ca-muted)]">Top-N rankings</p>
        <h2 className="mt-2 text-2xl font-semibold text-[var(--ca-text)]">Explore Index</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--ca-muted)]">
          Compare trend scores by entity level. Sparse rows stay visible when they carry a usable signal.
        </p>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2" role="tablist" aria-label="Ranking scopes">
        {scopes.map((scope) => {
          const selected = activeScope.key === scope.key;

          return (
            <button
              aria-pressed={selected}
              className={`min-h-11 rounded-xl border px-2 py-2 text-xs font-semibold transition ${
                selected
                  ? 'border-[var(--ca-border-strong)] bg-[rgba(34,211,238,0.12)] text-[var(--ca-cyan)]'
                  : 'border-white/10 bg-white/[0.035] text-[var(--ca-muted)] hover:border-[var(--ca-border)] hover:text-[var(--ca-text)]'
              }`}
              key={scope.key}
              onClick={() => setActiveScope(scope)}
              type="button"
            >
              {scope.label}
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex-1 space-y-3 overflow-y-auto pr-1">
        {rows.length === 0 ? (
          <EmptyState />
        ) : (
          rows.map((entry, index) => {
            const entity = latest.data?.entities[entry.entityId];
            const confidence = entity?.confidence ?? entry.confidence;
            const lowConfidence = confidence <= 2;
            const name = entity?.name ?? entry.entityId;

            return (
              <button
                aria-label={`Select ${name}`}
                className={`w-full rounded-2xl border bg-white/[0.035] p-4 text-left transition hover:border-[var(--ca-border-strong)] ${
                  lowConfidence
                    ? 'border-[rgba(245,158,11,0.28)] text-[var(--ca-muted)]'
                    : 'border-white/10 text-[var(--ca-text)]'
                }`}
                key={entry.entityId}
                onClick={() => onSelect?.(activeScope.type, entry.entityId)}
                type="button"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="ca-tabular text-xs text-[var(--ca-muted)]">#{index + 1}</p>
                    <h3 className="mt-1 text-sm font-semibold text-[var(--ca-text)]">{name}</h3>
                  </div>
                  <div className="ca-tabular text-right text-2xl font-semibold text-[var(--ca-cyan)]">
                    {entry.score.toFixed(1)}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <ConfidenceBadge value={confidence} />
                  <CompletenessBadge value={entity?.dataCompleteness ?? 'partial'} />
                  <FreshnessBadge timestamp={entity?.lastUpdated ?? rankings.data?.generated ?? new Date().toISOString()} />
                </div>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
