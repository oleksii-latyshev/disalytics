import { Text, useT } from '@disa/i18n';
import { cn } from '@disa/ui';
import { type KeyboardEvent, useRef } from 'react';
import {
  matchesFilter,
  type RoundEntry,
  type RoundFilter,
  roundForKey,
} from '../helpers/round-tactics';
import { TacticRoundFilters } from './TacticRoundFilters';

interface Props {
  entries: readonly RoundEntry[];
  roundIndex: number | undefined;
  filter: RoundFilter;
  onFilter: (filter: RoundFilter) => void;
  onRound: (roundIndex: number) => void;
}

const WINNER_BAR = { CT: 'bg-ct', T: 'bg-t' } as const;

function pillLabel(t: ReturnType<typeof useT>, entry: RoundEntry): string {
  return t('review.tactics.pill', {
    round: entry.number,
    side: entry.side,
    result: t(entry.didWin ? 'review.tactics.row.won' : 'review.tactics.row.lost'),
    plant: t(entry.isPlanted ? 'review.tactics.row.planted' : 'review.tactics.row.noPlant'),
  });
}

/**
 * A team's rounds as pills, numbered, each underlined in the colour of the side that won it, with a
 * dotted break where a half or an overtime starts. Won or lost is in the pill's name and tooltip, so
 * the underline is never the only carrier. The filter rides at the end of the row; a round it does
 * not match is dimmed, stays pressable, and is walked past by the arrow keys.
 */
export function TacticRoundStrip({ entries, roundIndex, filter, onFilter, onRound }: Props) {
  const t = useT();
  const list = useRef<HTMLUListElement>(null);

  const handleKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    const at = entries.findIndex((entry) => entry.roundIndex === roundIndex);
    const next = roundForKey(entries, filter, at, event.key);
    if (next === null) return;
    event.preventDefault();
    if (next === undefined) return;
    onRound(next.roundIndex);
    list.current?.querySelector<HTMLElement>(`[data-round="${next.roundIndex}"]`)?.focus();
  };

  return (
    <div className="flex items-stretch gap-2 px-3 pb-2 lg:px-4">
      {entries.length === 0 ? (
        <p className="m-0 min-w-0 flex-1 self-center text-12 text-ink-dim">
          <Text path="review.tactics.list.empty" />
        </p>
      ) : (
        <ul
          ref={list}
          aria-label={t('review.tactics.list.label')}
          onKeyDown={handleKeyDown}
          className="m-0 flex min-w-0 flex-1 list-none items-stretch gap-1 overflow-x-auto p-0"
        >
          {entries.map((entry) => {
            const isChosen = entry.roundIndex === roundIndex;
            const label = pillLabel(t, entry);
            return (
              <li
                key={entry.roundIndex}
                className={cn(
                  'relative flex min-w-6 flex-1',
                  entry.startsSegment &&
                    'ms-2 before:absolute before:inset-y-1 before:-left-1.5 before:border-line before:border-l before:border-dashed',
                )}
              >
                <button
                  type="button"
                  aria-pressed={isChosen}
                  aria-label={label}
                  title={label}
                  data-round={entry.roundIndex}
                  tabIndex={isChosen ? 0 : -1}
                  onClick={() => onRound(entry.roundIndex)}
                  className={cn(
                    'numeric relative h-7 w-full overflow-hidden rounded-chip px-0.5 text-13 transition-colors hover:bg-hover',
                    isChosen ? 'bg-selected font-medium text-ink' : 'text-ink-dim',
                    !matchesFilter(entry, filter) && 'opacity-35',
                  )}
                >
                  {entry.number}
                  <span
                    aria-hidden="true"
                    className={cn('absolute inset-x-0 bottom-0 h-0.5', WINNER_BAR[entry.winner])}
                  />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <TacticRoundFilters filter={filter} onChange={onFilter} />
    </div>
  );
}
