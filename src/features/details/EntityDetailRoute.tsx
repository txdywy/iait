import { useParams } from 'react-router-dom';

export default function EntityDetailRoute() {
  const { type, id } = useParams();

  return (
    <section aria-label="Entity detail rail" className="rounded-2xl border border-[var(--ca-border)] bg-[rgba(11,17,32,0.82)] p-4 font-mono text-sm text-[var(--ca-text)]">
      <p className="text-xs uppercase tracking-[0.08em] text-[var(--ca-cyan)]">Loading detail...</p>
      <p className="mt-2 text-[var(--ca-muted)]">
        Preparing {type === 'data-center-cluster' ? 'data-center-cluster' : type} detail for {id}.
      </p>
    </section>
  );
}
