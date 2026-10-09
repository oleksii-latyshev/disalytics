import type { ReactNode } from 'react';

export function Section({
  title,
  children,
  aside,
}: {
  title: ReactNode;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-card border border-line bg-surface-1 p-4">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-medium text-14 text-ink">{title}</h2>
        {aside === undefined ? null : <div className="text-12 text-ink-dim">{aside}</div>}
      </header>
      {children}
    </section>
  );
}

export function Muted({ children }: { children: ReactNode }) {
  return <p className="text-13 text-ink-dim">{children}</p>;
}
