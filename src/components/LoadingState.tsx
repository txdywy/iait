interface LoadingStateProps {
  label?: string;
}

interface ErrorStateProps {
  message?: string;
}

export function LoadingState({ label = 'Loading compute index' }: LoadingStateProps) {
  return (
    <div className="ca-panel rounded-2xl p-4 font-mono text-sm text-[var(--ca-muted)]" role="status">
      <div className="mb-3 h-1 overflow-hidden rounded-full bg-white/10">
        <div className="h-full w-1/3 rounded-full bg-[var(--ca-cyan)] shadow-[0_0_18px_rgba(34,211,238,0.5)]" />
      </div>
      {label}
    </div>
  );
}

export function ErrorState({
  message = 'Compute data could not load. Check the static data files, then retry or continue with the last committed dataset.',
}: ErrorStateProps) {
  return (
    <div className="rounded-2xl border border-[rgba(239,68,68,0.34)] bg-[rgba(11,17,32,0.78)] p-4 font-mono text-sm text-[var(--ca-text)]" role="alert">
      {message}
    </div>
  );
}

export function EmptyState() {
  return (
    <div className="rounded-2xl border border-[var(--ca-border)] bg-[rgba(11,17,32,0.72)] p-4 font-mono">
      <h2 className="text-xl font-semibold text-[var(--ca-text)]">No compute signals found</h2>
      <p className="mt-3 text-sm leading-6 text-[var(--ca-muted)]">
        Try a broader entity level, clear filters, or select another region on the map. Sparse entities
        remain visible when a usable trend signal exists.
      </p>
    </div>
  );
}
