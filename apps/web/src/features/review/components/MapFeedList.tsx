import type { PlayerInfo, PlayerSlot } from '@disa/demo-core';
import { Text, useT } from '@disa/i18n';
import { useMemo } from 'react';
import { EventRow, type NameOfSlot, type RowEvent } from '@/core/events';

export interface MapFeedItem {
  readonly key: string;
  readonly roundNumber: number;
  readonly event: RowEvent;
  /** The row's whole accessible name, without the round, which this list adds. */
  readonly label: string;
}

interface Props {
  label: string;
  items: readonly MapFeedItem[];
  players: readonly PlayerInfo[];
  /** The row isolated on the map, by index into `items`. */
  focused: number | null;
  onFocused: (index: number | null) => void;
  /** What pressing a row does, and what its accessible name says about it. Absent: nothing. */
  press?: { readonly onPress: (index: number) => void; readonly describe: string } | undefined;
}

/**
 * Every mark on a map screen as a line of reading, down the left like §5.4's feed — #386. It is the
 * keyboard's route to every mark: a mark on a canvas cannot take focus, and a row can.
 *
 * **Hover and focus do the same thing**, which is §5.4's rule: the row's mark is isolated on the map
 * and everything else dims. A row keeps it while it has focus, so a pressed row stays isolated when
 * the pointer moves over to the map to look at it.
 */
export function MapFeedList({ label, items, players, focused, onFocused, press }: Props) {
  const t = useT();

  const names = useMemo(() => {
    const bySlot: (string | undefined)[] = [];
    for (const player of players) bySlot[player.slot] = player.name;

    return bySlot;
  }, [players]);

  const nameOf: NameOfSlot = (slot: PlayerSlot | null) =>
    (slot === null ? undefined : names[slot]) ?? t('review.feed.unknownPlayer');

  return (
    <ul
      aria-label={label}
      className="flex min-h-0 min-w-0 flex-1 list-none flex-col gap-0.5 overflow-y-auto p-0"
    >
      {items.map((item, index) => (
        <li key={item.key} className="min-w-0">
          <button
            type="button"
            aria-label={[
              t('review.maps.rowLabel', { round: item.roundNumber, event: item.label }),
              press?.describe,
            ]
              .filter(Boolean)
              .join('. ')}
            aria-current={focused === index ? 'true' : undefined}
            onClick={() => press?.onPress(index)}
            onPointerEnter={() => onFocused(index)}
            onPointerLeave={(event) => {
              if (document.activeElement !== event.currentTarget) onFocused(null);
            }}
            onFocus={() => onFocused(index)}
            onBlur={() => onFocused(null)}
            className={`flex w-full min-w-0 items-center gap-2 rounded-chip px-1.5 py-0.5 text-left text-13 text-ink transition-colors duration-(--duration-micro) ease-out hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
              focused === index ? 'bg-surface-2' : ''
            }`}
          >
            <span className="numeric w-8 shrink-0 text-12 text-ink-dim">
              <Text path="review.maps.roundShort" values={{ round: item.roundNumber }} />
            </span>
            <EventRow event={item.event} nameOf={nameOf} />
          </button>
        </li>
      ))}
    </ul>
  );
}
