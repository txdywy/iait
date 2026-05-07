import { lazy, Suspense, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { EntityType } from '../data/types';
import type { EntityLevel } from '../data/types';
import { ComputeMap } from '../features/map/ComputeMap';
import { RankingRail } from '../features/rankings/RankingRail';
import { useExplorerStore } from '../store/explorer-store';

const EntityDetailRoute = lazy(() => import('../features/details/EntityDetailRoute'));

function updateHashRoute(level: EntityLevel, id: string) {
  window.location.hash = `/entity/${level}/${encodeURIComponent(id)}`;
}

function isRouteLevel(value: string | undefined): value is EntityLevel {
  return value === EntityType.COUNTRY
    || value === EntityType.CITY
    || value === EntityType.CLOUD_REGION
    || value === EntityType.COMPANY
    || value === 'data-center-cluster';
}

export function App() {
  const { type, id } = useParams();
  const { setSelection, setViewportIntent } = useExplorerStore();
  const routeType = isRouteLevel(type) ? type : null;
  const routeId = id ? decodeURIComponent(id) : null;
  const shouldShowDetail = Boolean(routeType && routeId);

  useEffect(() => {
    if (!routeType || !routeId) {
      return;
    }

    setViewportIntent(routeType === EntityType.COUNTRY ? { type: 'fit-country', id: routeId } : { type: 'focus-entity', id: routeId });
    setSelection(routeType, routeId);
  }, [routeId, routeType, setSelection, setViewportIntent]);

  function handleRankingSelect(type: EntityType, id: string) {
    setViewportIntent(type === EntityType.COUNTRY ? { type: 'fit-country', id } : { type: 'focus-entity', id });
    setSelection(type, id);
    updateHashRoute(type, id);
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[var(--ca-bg)] text-[var(--ca-text)]">
      <section className="relative isolate flex min-h-screen flex-col px-6 py-5 lg:px-10">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_18%,rgba(34,211,238,0.14),transparent_30%),radial-gradient(circle_at_78%_12%,rgba(34,197,94,0.1),transparent_28%),linear-gradient(135deg,#060A12_0%,#0B1120_52%,#060A12_100%)]" />
        <header className="flex items-center justify-between border-b border-[var(--ca-border)] pb-4 font-mono uppercase tracking-[0.28em] text-[var(--ca-muted)]">
          <span className="text-lg font-semibold text-[var(--ca-text)]">ComputeAtlas</span>
          <span className="hidden text-xs text-[var(--ca-cyan)] sm:inline">Explore Index</span>
        </header>

        <div className="grid flex-1 gap-5 py-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="ca-panel relative min-h-[560px] overflow-hidden rounded-3xl p-0">
            <ComputeMap />
          </section>

          <aside className="ca-panel flex flex-col gap-5 rounded-3xl p-6">
            {shouldShowDetail ? (
              <Suspense fallback={<div className="font-mono text-sm text-[var(--ca-cyan)]">Loading detail...</div>}>
                <EntityDetailRoute />
              </Suspense>
            ) : null}
            <RankingRail onSelect={handleRankingSelect} />
          </aside>
        </div>
      </section>
    </main>
  );
}
