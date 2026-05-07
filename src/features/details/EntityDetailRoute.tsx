import { lazy, Suspense } from 'react';
import { useParams } from 'react-router-dom';
import { CompletenessBadge, ConfidenceBadge, FreshnessBadge, RiskBadge } from '../../components/StatusBadges';
import { useCrossRef, useEntitySourceSummary, useHistory, useIndexConfig, useLatestIndex } from '../../data/queries';
import { EntityType } from '../../data/types';
import type { EntityLevel } from '../../data/types';
import { resolveClusterDetail } from '../map/drilldown';
import { FactorBreakdown } from './FactorBreakdown';

const TrendChart = lazy(() => import('../trends/TrendChart'));

const realEntityTypes = [EntityType.COUNTRY, EntityType.CITY, EntityType.CLOUD_REGION, EntityType.COMPANY] as const;

function isRealEntityType(type: string | undefined): type is EntityType {
  return realEntityTypes.includes(type as EntityType);
}

function isEntityLevel(type: string | undefined): type is EntityLevel {
  return isRealEntityType(type) || type === 'data-center-cluster';
}

function DetailShell({ children }: { children: React.ReactNode }) {
  return (
    <section aria-label="Entity detail rail" className="rounded-2xl border border-[var(--ca-border)] bg-[rgba(11,17,32,0.82)] p-4 font-mono text-sm text-[var(--ca-text)]">
      {children}
    </section>
  );
}

function ReturnLink() {
  return (
    <a className="inline-flex min-h-11 items-center rounded-xl border border-[var(--ca-border)] px-3 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ca-cyan)] hover:border-[var(--ca-border-strong)]" href="#/">
      Return to map
    </a>
  );
}

function MetricLine({ label, value }: { label: string; value: string }) {
  return (
    <p className="ca-tabular rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-xs text-[var(--ca-text)]">
      {label}: {value}
    </p>
  );
}

function SourceCoverage({ type, id }: { type: EntityType; id: string }) {
  const summary = useEntitySourceSummary(type, id);
  const sources = Array.from(new Set(summary.data?.sources.map((record) => record.source).filter(Boolean) ?? []));

  if (summary.isLoading) {
    return <p className="text-xs text-[var(--ca-muted)]">Loading source coverage</p>;
  }

  if (summary.data && !summary.data.available) {
    return <p className="text-xs text-[var(--ca-muted)]">Source file unavailable</p>;
  }

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.08em] text-[var(--ca-muted)]">Contributing source coverage</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {sources.length > 0 ? sources.map((source) => (
          <span className="rounded-full border border-white/10 bg-white/[0.045] px-2.5 py-1 text-xs text-[var(--ca-text)]" key={source}>{source}</span>
        )) : <span className="text-xs text-[var(--ca-muted)]">Partial source coverage</span>}
      </div>
    </div>
  );
}

function ClusterDetail({ id }: { id: string }) {
  const crossRef = useCrossRef();

  if (crossRef.isLoading) {
    return <DetailShell><p className="text-[var(--ca-cyan)]">Loading detail...</p></DetailShell>;
  }

  const cluster = crossRef.data ? resolveClusterDetail(id, crossRef.data) : null;

  if (!cluster) {
    return (
      <DetailShell>
        <div className="space-y-4">
          <ReturnLink />
          <p className="text-lg font-semibold">No compute signals found</p>
          <p className="text-[var(--ca-muted)]">Try a broader entity level, clear filters, or select another region on the map. Sparse entities remain visible when a usable trend signal exists.</p>
        </div>
      </DetailShell>
    );
  }

  return (
    <DetailShell>
      <div className="space-y-4">
        <ReturnLink />
        <div>
          <p className="text-xs uppercase tracking-[0.08em] text-amber-200">data-center-cluster</p>
          <h2 className="mt-2 text-xl font-semibold text-[var(--ca-text)]">{cluster.label}</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--ca-muted)]">
            This is a modeled cluster proxy derived from cloud-region presence and is not a verified facility or exact data-center location.
          </p>
        </div>
        <div className="space-y-2">
          <MetricLine label="Parent cloud region" value={cluster.parentCloudRegionId} />
          <MetricLine label="Provider" value={cluster.provider} />
          <MetricLine label="Country" value={cluster.country} />
          <MetricLine label="City" value={cluster.city} />
        </div>
      </div>
    </DetailShell>
  );
}

function RealEntityDetail({ type, id }: { type: EntityType; id: string }) {
  const latest = useLatestIndex();
  const config = useIndexConfig();
  const history = useHistory();

  if (latest.isLoading || config.isLoading) {
    return <DetailShell><p className="text-[var(--ca-cyan)]">Loading detail...</p></DetailShell>;
  }

  const entity = latest.data?.entities[id];

  if (!entity || !config.data) {
    return (
      <DetailShell>
        <div className="space-y-4">
          <ReturnLink />
          <p className="text-lg font-semibold">No compute signals found</p>
          <p className="text-[var(--ca-muted)]">Try a broader entity level, clear filters, or select another region on the map. Sparse entities remain visible when a usable trend signal exists.</p>
        </div>
      </DetailShell>
    );
  }

  const historyEntry = history.data?.[id];

  return (
    <DetailShell>
      <div className="space-y-5">
        <ReturnLink />
        <div>
          <p className="text-xs uppercase tracking-[0.08em] text-[var(--ca-cyan)]">{type} detail · predictive trend signal</p>
          <h2 className="mt-2 text-xl font-semibold text-[var(--ca-text)]">{entity.name}</h2>
          <div className="ca-tabular mt-3 text-4xl font-semibold text-[var(--ca-cyan)]">{entity.score.toFixed(1)}</div>
          <p className="mt-2 text-sm leading-6 text-[var(--ca-muted)]">
            Trend signal framing: this index is a predictive compute supply indicator, not an exact capacity census.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <ConfidenceBadge value={entity.confidence} />
          <CompletenessBadge value={entity.dataCompleteness ?? 'partial'} />
          <FreshnessBadge timestamp={entity.lastUpdated} staleDays={config.data.confidence.staleDays} />
          <RiskBadge tier={entity.riskTier} multiplier={entity.riskMultiplier} />
        </div>

        <div className="rounded-2xl border border-amber-300/20 bg-amber-400/10 p-3 text-xs leading-5 text-amber-100">
          Risk adjustment is a Modeling assumption used to describe index sensitivity and should be read as non-alarmist risk modeling context.
        </div>

        <SourceCoverage type={type} id={id} />

        <div>
          <p className="mb-2 text-xs uppercase tracking-[0.08em] text-[var(--ca-muted)]">Factor coverage</p>
          <FactorBreakdown entity={entity} config={config.data} />
        </div>

        {historyEntry?.series?.length ? (
          <Suspense fallback={<div className="font-mono text-sm text-[var(--ca-cyan)]">Loading trend chart...</div>}>
            <TrendChart historyEntry={historyEntry} />
          </Suspense>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-xs leading-5 text-[var(--ca-muted)]">No recent history</div>
        )}
      </div>
    </DetailShell>
  );
}

export default function EntityDetailRoute() {
  const { type, id } = useParams();
  const decodedId = id ? decodeURIComponent(id) : '';

  if (!isEntityLevel(type) || !decodedId) {
    return (
      <DetailShell>
        <div className="space-y-4">
          <ReturnLink />
          <p className="text-lg font-semibold">No compute signals found</p>
        </div>
      </DetailShell>
    );
  }

  if (type === 'data-center-cluster') {
    return <ClusterDetail id={decodedId} />;
  }

  return <RealEntityDetail type={type} id={decodedId} />;
}
