import { lazy, Suspense, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { EntityType } from '../data/types';
import type { EntityLevel } from '../data/types';
import { RankingRail } from '../features/rankings/RankingRail';
import { useExplorerStore } from '../store/explorer-store';

const ComputeMap = lazy(() => import('../features/map/ComputeMap').then((module) => ({ default: module.ComputeMap })));
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

function safeDecodeRouteParam(value: string | undefined) {
  if (!value) return null;

  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

export function App() {
  const { type, id } = useParams();
  const { setSelection, setViewportIntent } = useExplorerStore();
  const routeType = isRouteLevel(type) ? type : null;
  const routeId = safeDecodeRouteParam(id);
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
          <span className="hidden text-xs text-[var(--ca-cyan)] sm:inline">GitHub Pages live build</span>
        </header>

        <section className="grid gap-5 pt-6 lg:grid-cols-[minmax(0,1fr)_360px]" aria-label="ComputeAtlas launch summary">
          <div className="ca-panel rounded-3xl p-6 md:p-8">
            <p className="font-mono text-xs uppercase tracking-[0.32em] text-[var(--ca-cyan)]">AI Compute Index</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-tight text-[var(--ca-text)] md:text-6xl">
              Predictive heat signals for the global AI compute economy.
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-[var(--ca-muted)] md:text-lg">
              ComputeAtlas estimates where capacity is expanding, plateauing, or concentrating across countries,
              cities, cloud regions, companies, and modeled data-center clusters.
            </p>
          </div>

          <div className="ca-panel grid content-between gap-5 rounded-3xl p-6 font-mono">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--ca-muted)]">Launch status</p>
              <p className="mt-3 text-2xl font-semibold text-[var(--ca-green)]">Static data online</p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
                <p className="text-2xl font-semibold text-[var(--ca-cyan)]">5</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-[var(--ca-muted)]">Levels</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
                <p className="text-2xl font-semibold text-[var(--ca-cyan)]">24h</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-[var(--ca-muted)]">Refresh</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
                <p className="text-2xl font-semibold text-[var(--ca-cyan)]">0</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-[var(--ca-muted)]">Backend</p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid flex-1 gap-5 py-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="ca-panel relative min-h-[560px] overflow-hidden rounded-3xl p-0">
            <Suspense fallback={<div className="flex h-full min-h-[560px] items-center justify-center font-mono text-sm text-[var(--ca-cyan)]">Loading compute map</div>}>
              <ComputeMap />
            </Suspense>
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
