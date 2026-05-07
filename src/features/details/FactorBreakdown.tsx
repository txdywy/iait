import type { CompiledEntity, IndexConfig } from '../../data/types';

interface FactorBreakdownProps {
  entity: CompiledEntity;
  config: IndexConfig;
}

function formatNumber(value: number | undefined, digits = 1) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : 'Factor unavailable';
}

function formatPercent(value: number | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? `${Math.round(value * 100)}%` : 'Factor unavailable';
}

export function FactorBreakdown({ entity, config }: FactorBreakdownProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035]">
      <table className="w-full border-collapse font-mono text-xs">
        <thead className="bg-white/[0.04] text-left uppercase tracking-[0.08em] text-[var(--ca-muted)]">
          <tr>
            <th className="px-3 py-2 font-semibold">Factor</th>
            <th className="px-3 py-2 font-semibold">Raw value</th>
            <th className="px-3 py-2 font-semibold">Normalized score</th>
            <th className="px-3 py-2 font-semibold">Weight</th>
            <th className="px-3 py-2 font-semibold">Contribution</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(config.factors).map(([factorId, factor]) => {
            const breakdown = entity.factorBreakdown?.[factorId];
            const weight = breakdown?.weight ?? factor.weight;
            const contribution = breakdown && Number.isFinite(breakdown.normalized) && Number.isFinite(weight)
              ? breakdown.normalized * weight
              : undefined;
            const unavailable = !breakdown;

            return (
              <tr className="border-t border-white/10" key={factorId}>
                <th className="px-3 py-2 text-left font-semibold text-[var(--ca-text)]">
                  <span className="block">{factorId}</span>
                  <span className="mt-1 block font-normal normal-case tracking-normal text-[var(--ca-muted)]">{factor.description}</span>
                </th>
                <td className={unavailable ? 'px-3 py-2 text-[var(--ca-muted)]' : 'ca-tabular px-3 py-2 text-[var(--ca-text)]'}>{formatNumber(breakdown?.raw, 2)}</td>
                <td className={unavailable ? 'px-3 py-2 text-[var(--ca-muted)]' : 'ca-tabular px-3 py-2 text-[var(--ca-cyan)]'}>{formatNumber(breakdown?.normalized, 1)}</td>
                <td className="ca-tabular px-3 py-2 text-[var(--ca-text)]">{formatPercent(weight)}</td>
                <td className={unavailable ? 'px-3 py-2 text-[var(--ca-muted)]' : 'ca-tabular px-3 py-2 text-[var(--ca-green)]'}>{formatNumber(contribution, 1)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
