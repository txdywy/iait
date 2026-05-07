const signalCards = [
  { label: 'Coverage', value: '10 countries', tone: 'cyan' },
  { label: 'Update mode', value: 'Static JSON', tone: 'green' },
  { label: 'Signal type', value: 'Trend index', tone: 'amber' },
];

export function App() {
  return (
    <main className="min-h-screen overflow-hidden bg-[var(--ca-bg)] text-[var(--ca-text)]">
      <section className="relative isolate flex min-h-screen flex-col px-6 py-5 lg:px-10">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(0,229,255,0.18),transparent_32%),radial-gradient(circle_at_80%_10%,rgba(43,255,136,0.12),transparent_28%),linear-gradient(135deg,#05070d_0%,#0a0f1f_48%,#05070d_100%)]" />
        <header className="flex items-center justify-between border-b border-[var(--ca-border)] pb-4 font-mono uppercase tracking-[0.28em] text-cyan-100/80">
          <span className="text-lg font-semibold text-cyan-100">ComputeAtlas</span>
          <span className="hidden text-xs sm:inline">Explore Index</span>
        </header>

        <div className="grid flex-1 gap-5 py-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="ca-panel relative flex min-h-[560px] items-center justify-center overflow-hidden rounded-3xl p-8">
            <div className="absolute inset-6 rounded-[1.5rem] border border-cyan-300/10 bg-[linear-gradient(90deg,rgba(0,229,255,0.05)_1px,transparent_1px),linear-gradient(rgba(0,229,255,0.05)_1px,transparent_1px)] bg-[size:44px_44px]" />
            <div className="relative max-w-3xl text-center">
              <p className="font-mono text-sm uppercase tracking-[0.35em] text-[var(--ca-cyan)]">
                Predictive compute trend signal
              </p>
              <h1 className="mt-5 text-5xl font-semibold tracking-tight text-white md:text-7xl">
                Map-first AI compute capacity intelligence
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-300">
                Loading compute index data from static assets for the global heatmap, rankings,
                and detail rails that power Phase 3 exploration.
              </p>
            </div>
          </section>

          <aside className="ca-panel flex flex-col justify-between rounded-3xl p-6">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.3em] text-cyan-200/70">
                Initial shell
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-white">Explore Index</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                This executable baseline keeps heavy map, ranking, and chart modules out of the
                first foundation task while preserving the HUD visual direction.
              </p>
            </div>

            <dl className="mt-8 grid gap-3">
              {signalCards.map((card) => (
                <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4" key={card.label}>
                  <dt className="font-mono text-xs uppercase tracking-[0.24em] text-slate-400">
                    {card.label}
                  </dt>
                  <dd className={`mt-2 font-mono text-xl ca-tone-${card.tone}`}>{card.value}</dd>
                </div>
              ))}
            </dl>
          </aside>
        </div>
      </section>
    </main>
  );
}
