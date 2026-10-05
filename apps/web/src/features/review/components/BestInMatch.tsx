import type { OpeningSide, ParsedDemo, PlayerSlot, PlayerStats } from '@disa/demo-core';
import { Text, useLocale } from '@disa/i18n';
import { useMemo } from 'react';
import { BEST_CARDS, bestHolders } from '../helpers/player-table';
import type { StatWriter } from '../helpers/stat-writer';
import { TeamTag } from './TeamTag';

interface Props {
  demo: ParsedDemo;
  players: readonly PlayerStats[];
  teamOf: ReadonlyMap<PlayerSlot, OpeningSide>;
  write: StatWriter;
  opened: PlayerSlot | null;
  onOpen: (slot: PlayerSlot) => void;
  /** Whether a column that needs flash events can be stated at all. */
  hasFlashData: boolean;
}

/**
 * The player who leads each figure a post-match page opens with. A press opens that player's row.
 * A figure nobody leads — everyone level, or every number zero — gets no card.
 */
export function BestInMatch({ demo, players, teamOf, write, opened, onOpen, hasFlashData }: Props) {
  const locale = useLocale();
  const list = useMemo(() => new Intl.ListFormat(locale, { type: 'conjunction' }), [locale]);
  const cards = useMemo(
    () =>
      BEST_CARDS.flatMap(({ column, titlePath }) => {
        if (!hasFlashData && column.needsFlashData === true) return [];
        const holders = bestHolders(players, column);
        return holders === null ? [] : [{ column, titlePath, holders }];
      }),
    [players, hasFlashData],
  );

  return (
    <aside className="flex flex-col gap-2">
      <h3 className="label-dense px-0.5 py-1 text-ink-dim">
        <Text path="review.stats.best.title" />
      </h3>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-2 wide:grid-cols-1">
        {cards.map(({ column, titlePath, holders }) => {
          const first = holders.slots[0];
          const teams = [...new Set(holders.slots.flatMap((slot) => teamOf.get(slot) ?? []))];
          const names = holders.slots.map(
            (slot) => demo.header.players.find((entry) => entry.slot === slot)?.name ?? '',
          );

          return (
            <button
              key={column.id}
              type="button"
              onClick={() => first !== undefined && onOpen(first)}
              className={`surface-card flex w-full cursor-pointer items-center gap-3 rounded-card px-3.5 py-3 text-left transition-colors duration-(--duration-micro) ease-out hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
                opened !== null && holders.slots.includes(opened) ? 'border-line-strong' : ''
              }`}
            >
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-11 text-ink-dim">
                  <Text path={titlePath} />
                </span>
                <span className="break-words text-16 font-medium text-ink">
                  {list.format(names)}
                </span>
                <span className="flex flex-wrap gap-x-3 text-11 text-ink-faint">
                  {teams.map((team) => (
                    <TeamTag key={team} team={team} />
                  ))}
                </span>
              </span>
              <span className="numeric text-20 text-ink">
                {write(holders.value, column.format)}
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
