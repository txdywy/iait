import type { ReactNode } from 'react';

interface HudPanelProps {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  selected?: boolean;
}

export function HudPanel({ title, eyebrow, children, selected = false }: HudPanelProps) {
  return (
    <section
      className={`ca-panel rounded-2xl border p-4 font-mono backdrop-blur ${
        selected ? 'ca-panel-selected border-[var(--ca-border-strong)]' : 'border-[var(--ca-border)]'
      }`}
    >
      {eyebrow ? (
        <p className="mb-2 text-xs uppercase tracking-[0.08em] text-[var(--ca-muted)]">{eyebrow}</p>
      ) : null}
      <h2 className="text-xl font-semibold text-[var(--ca-text)]">{title}</h2>
      <div className="mt-3 text-sm leading-6 text-[var(--ca-muted)]">{children}</div>
    </section>
  );
}
