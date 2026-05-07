const signalCards = [
  { label: 'Coverage', value: '10 countries', tone: 'cyan' },
  { label: 'Update mode', value: 'Static JSON', tone: 'green' },
  { label: 'Signal type', value: 'Trend index', tone: 'amber' },
];

export function App() {
  return (
    <main className="min-h-screen overflow-hidden bg-[var(--ca-bg)] text-[var(--ca-text)]">
      <section className="relative isolate flex min-h-screen flex-col px-6 py-5 lg:px-10">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_18%,rgba(34,211,238,0.14),transparent_30%),radial-gradient(circle_at_78%_12%,rgba(34,197,94,0.1),transparent_28%),linear-gradient(135deg,#060A12_0%,#0B1120_52%,#060A12_100%)]" />
        <header className="flex items-center justify-between border-b border-[var(--ca-border)] pb-4 font-mono uppercase tracking-[0.28em] text-[var(--ca-muted)]">
          <span className="text-lg font-semibold text-[var(--ca-text)]">ComputeAtlas</span>
          <span className="hidden text-xs text-[var(--ca-cyan)] sm:inline">Explore Index</span>
        </header>

        <div className="grid flex-1 gap-5 py-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section
            aria-label="Loading compute index"
            className="ca-panel relative flex min-h-[560px] items-center justify-center overflow-hidden rounded-3xl p-8"
          >
            <div className="absolute inset-6 rounded-[1.5rem] border border-cyan-300/10 bg-[linear-gradient(90deg,rgba(34,211,238,0.05)_1px,transparent_1px),linear-gradient(rgba(34,211,238,0.05)_1px,transparent_1px)] bg-[size:44px_44px]" />
            <div className="absolute left-8 top-8 rounded-full border border-[var(--ca-border)] bg-[var(--ca-surface)] px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] text-[var(--ca-cyan)]">
              Loading compute index
            </div>
            <div className="relative max-w-3xl text-center">
              <p className="font-mono text-sm uppercase tracking-[0.08em] text-[var(--ca-cyan)]">
                Predictive compute trend signal
              </p>
              <h1 className="mt-5 text-5xl font-semibold tracking-tight text-[var(--ca-text)] md:text-7xl">
                Map-first AI compute capacity intelligence
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-[var(--ca-muted)]">
                The dark map shell is ready for static JSON-powered heatmaps, rankings, and
                detail rails while heavier visualization modules stay deferred to later plans.
              </p>
            </div>
          </section>

          <aside className="ca-panel flex flex-col justify-between rounded-3xl p-6">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.08em] text-[var(--ca-muted)]">
                Ranking rail slot
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-[var(--ca-text)]">Explore Index</h2>
              <p className="mt-3 text-sm leading-6 text-[var(--ca-muted)]">
                Rankings connect here after the tested rail component is created. Until then, this
                inert slot preserves the map-first shell proportions.
              </p>
            </div>

            <dl className="mt-8 grid gap-3">
              {signalCards.map((card) => (
                <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4" key={card.label}>
                  <dt className="font-mono text-xs uppercase tracking-[0.08em] text-[var(--ca-muted)]">
                    {card.label}
                  </dt>
                  <dd className={`ca-tabular mt-2 font-mono text-xl ca-tone-${card.tone}`}>
                    {card.value}
                  </dd>
                </div>
              ))}
            </dl>
          </aside>
        </div>
      </section>
    </main>
  );
}
