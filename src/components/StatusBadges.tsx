type Completeness = 'full' | 'partial';

interface ConfidenceBadgeProps {
  value: number;
}

interface CompletenessBadgeProps {
  value?: Completeness;
}

interface FreshnessBadgeProps {
  timestamp: string;
  staleDays?: number;
}

interface RiskBadgeProps {
  tier?: string;
  multiplier?: number;
}

function badgeClass(tone: 'cyan' | 'green' | 'amber' | 'muted') {
  const toneClasses = {
    cyan: 'border-[rgba(34,211,238,0.32)] text-[var(--ca-cyan)]',
    green: 'border-[rgba(34,197,94,0.32)] text-[var(--ca-green)]',
    amber: 'border-[rgba(245,158,11,0.34)] text-[var(--ca-amber)]',
    muted: 'border-slate-500/30 text-[var(--ca-muted)]',
  };

  return `inline-flex items-center rounded-full border bg-[rgba(11,17,32,0.72)] px-2.5 py-1 font-mono text-xs leading-none ${toneClasses[tone]}`;
}

function clampConfidence(value: number) {
  if (!Number.isFinite(value)) {
    return 1;
  }

  if (value >= 0 && value <= 1) {
    return Math.min(5, Math.max(1, Math.round(value * 5)));
  }

  return Math.min(5, Math.max(1, Math.round(value)));
}

export function ConfidenceBadge({ value }: ConfidenceBadgeProps) {
  const confidence = clampConfidence(value);

  return <span className={badgeClass(confidence <= 2 ? 'amber' : 'cyan')}>Confidence {confidence}/5</span>;
}

export function CompletenessBadge({ value = 'partial' }: CompletenessBadgeProps) {
  const label = value === 'full' ? 'Full factors' : 'Partial factors';

  return <span className={badgeClass(value === 'full' ? 'green' : 'amber')}>{label}</span>;
}

export function FreshnessBadge({ timestamp, staleDays = 90 }: FreshnessBadgeProps) {
  const updated = Date.parse(timestamp);
  const ageDays = Number.isFinite(updated)
    ? Math.max(0, Math.floor((Date.now() - updated) / (24 * 60 * 60 * 1000)))
    : staleDays + 1;
  const label = ageDays === 0 ? 'Updated today' : ageDays > staleDays ? 'Stale' : `Updated ${ageDays}d ago`;

  return <span className={badgeClass(ageDays > staleDays ? 'amber' : 'muted')}>{label}</span>;
}

export function RiskBadge({ tier, multiplier }: RiskBadgeProps) {
  const tierLabel = tier ? `: ${tier}` : '';
  const multiplierLabel = typeof multiplier === 'number' && Number.isFinite(multiplier)
    ? ` (${multiplier.toFixed(2)}x)`
    : '';

  return (
    <span className={badgeClass('amber')}>
      Risk adjustment{tierLabel}{multiplierLabel} · Modeling assumption
    </span>
  );
}
