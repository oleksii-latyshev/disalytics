import { cn } from '@disa/ui';
import type { CSSProperties, PointerEvent, ReactNode } from 'react';

/** The pointer's place in the tile, written straight onto it: a spotlight must not render React. */
function followPointer(event: PointerEvent<HTMLLIElement>) {
  const tile = event.currentTarget;
  const box = tile.getBoundingClientRect();
  tile.style.setProperty('--mx', `${Math.round(event.clientX - box.left)}px`);
  tile.style.setProperty('--my', `${Math.round(event.clientY - box.top)}px`);
}

/** One cell of the overview's grid, the app's home tile: a hairline card with a spotlight. */
export function BentoTile({
  index,
  className,
  children,
  label,
  isBusy = false,
}: {
  /** The place in the arrival order. */
  index: number;
  className?: string;
  children: ReactNode;
  /** Names the tile for a screen reader when it has no heading of its own. */
  label?: string;
  isBusy?: boolean;
}) {
  return (
    <li
      aria-label={label}
      aria-busy={isBusy || undefined}
      onPointerMove={isBusy ? undefined : followPointer}
      style={{ '--tile-index': index } as CSSProperties}
      className={cn(
        'bento relative min-w-0 overflow-hidden rounded-float border border-line bg-surface-1',
        isBusy ? '' : 'bento-lit',
        className,
      )}
    >
      {children}
    </li>
  );
}

/** The heading line of a tile: its name on the left, one way on on the right. */
export function TileHead({ title, aside }: { title: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="font-medium text-14 text-ink">{title}</h2>
      {aside}
    </div>
  );
}

export const TILE_BODY = 'flex size-full min-h-0 flex-col gap-3 p-4 md:p-5';

/** A quiet link in a tile's corner, with the global focus ring. */
export const TILE_LINK =
  'relative z-3 shrink-0 rounded-chip text-12 text-ink-dim underline-offset-4 transition-colors hover:text-ink hover:underline';

export const BUTTON_PRIMARY =
  'relative z-3 inline-flex h-10 items-center gap-2 rounded-card bg-ink px-4 font-medium text-13 text-surface-0 transition-colors hover:bg-ink-dim';
export const BUTTON_SECONDARY =
  'relative z-3 inline-flex h-10 items-center gap-2 rounded-card border border-line-strong px-4 font-medium text-13 text-ink transition-colors hover:bg-hover';
