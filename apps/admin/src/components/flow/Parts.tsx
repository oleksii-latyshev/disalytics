import { cn } from '@disa/ui';
import type { ReactNode } from 'react';
import { type Tone, toneColor } from './status';

export function Dot({ tone }: { tone: Tone }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block size-2.5 flex-none rounded-full"
      style={{ background: toneColor(tone) }}
    />
  );
}

/** A small label in the colour of what it says, outlined in the same colour. */
export function Pill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 self-start rounded-full border border-current px-2.5 py-0.5 font-medium text-12"
      style={{ color: toneColor(tone) }}
    >
      <Dot tone={tone} />
      {children}
    </span>
  );
}

export function Chip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'whitespace-nowrap rounded-full border border-line-strong px-2.5 py-0.5 text-12 text-ink-dim',
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cn('min-w-0 rounded-card border border-line bg-surface-1 p-5', className)}>
      {children}
    </section>
  );
}
