import type { ParsedDemo, PlayerSlot, PlayerStats, TeamPlayerStats } from '@disa/demo-core';
import { Text, useLocale, useT } from '@disa/i18n';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { useMemo } from 'react';
import {
  bestValue,
  type PlayerColumn,
  type PlayerSort,
  type PlayerTable,
  sortPlayers,
} from '../helpers/player-table';
import { ScoreboardRounds } from './ScoreboardRounds';

interface Props {
  demo: ParsedDemo;
  table: PlayerTable;
  teams: readonly [TeamPlayerStats, TeamPlayerStats];
  /** False when the recording has no flash events, which makes those figures unknown, not zero. */
  hasFlashData: boolean;
  sort: PlayerSort | null;
  onSort: (column: PlayerColumn['id']) => void;
  /** Set where a row opens onto its round-by-round strip; the other tables hold plain names. */
  expandable?: {
    opened: PlayerSlot | null;
    onOpen: (slot: PlayerSlot | null) => void;
  };
}

const SIDE_TICK = { ct: 'bg-ct', t: 'bg-t' } as const;

type Writer = (value: number | null, column: PlayerColumn) => string;

/** `+3` reads as a gain where `3` reads as a count, and the minus is the character's own. */
function signed(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

function useWriter(): Writer {
  const locale = useLocale();

  return useMemo(() => {
    const integer = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
    const decimal1 = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
    const decimal2 = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    return (value, column) => {
      if (value === null) return '—';

      switch (column.format) {
        case 'signed':
          return signed(value);
        case 'percent':
          return `${integer.format(value)} %`;
        case 'decimal1':
          return decimal1.format(value);
        case 'decimal2':
          return decimal2.format(value);
        case 'integer':
          return integer.format(value);
      }
    };
  }, [locale]);
}

function ariaSortOf(
  sort: PlayerSort | null,
  column: PlayerColumn,
): 'ascending' | 'descending' | 'none' {
  if (sort?.column !== column.id) return 'none';
  return sort.direction === 'desc' ? 'descending' : 'ascending';
}

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus';

/**
 * One question of the Players tab, answered for both teams at once.
 *
 * **A heading is a button** because the order is the reader's to change, and a press on a native
 * button is the one interaction that is keyboard first for free. The sort holds inside a team; the
 * third press returns the order the scoreboard lists a team in.
 *
 * **The best figure in a column is the brighter one**, across all ten players: ink against
 * `ink-dim` and a step of weight, never a hue, because colour here belongs to the side.
 */
export function PlayerStatsTable({
  demo,
  table,
  teams,
  hasFlashData,
  sort,
  onSort,
  expandable,
}: Props) {
  const t = useT();
  const write = useWriter();

  const best = useMemo(() => {
    const everyone = teams.flatMap((team) => team.players);
    return table.columns.map((column) =>
      !hasFlashData && column.needsFlashData ? null : bestValue(everyone, column),
    );
  }, [teams, table.columns, hasFlashData]);

  const sorted = useMemo(() => teams.map((team) => sortPlayers(team.players, sort)), [teams, sort]);

  return (
    <section aria-labelledby={`players-${table.id}`} className="flex min-w-0 flex-col gap-3">
      <h3 id={`players-${table.id}`} className="font-ui font-medium text-20 leading-dense">
        <Text path={table.titlePath} />
      </h3>

      <div className="surface-card overflow-x-auto rounded-card px-4 pb-2">
        <table className="w-full border-collapse text-14">
          <thead>
            <tr className="text-12 text-ink-dim">
              <th scope="col" className="w-full min-w-[9rem] pt-4 pb-2 text-left font-normal">
                <span className="sr-only">
                  <Text path="review.board.player" />
                </span>
              </th>

              {table.columns.map((column) => {
                const isUnknown = !hasFlashData && column.needsFlashData === true;
                const isSorted = sort?.column === column.id;

                return (
                  <th
                    key={column.id}
                    scope="col"
                    aria-sort={ariaSortOf(sort, column)}
                    className="min-w-[5rem] px-2 pt-4 pb-2 text-right align-bottom font-normal"
                  >
                    <button
                      type="button"
                      title={
                        column.id.startsWith('multi') && column.labelValues !== undefined
                          ? t('review.stats.players.col.multiName', column.labelValues)
                          : undefined
                      }
                      disabled={isUnknown}
                      onClick={() => onSort(column.id)}
                      className={`inline-flex cursor-pointer items-end justify-end gap-1 rounded-chip px-1 py-0.5 text-right leading-dense transition-colors duration-(--duration-micro) ease-out hover:text-ink disabled:cursor-default disabled:hover:text-ink-dim ${FOCUS_RING} ${
                        isSorted ? 'text-ink' : ''
                      }`}
                    >
                      <span>{t(column.labelPath, column.labelValues)}</span>
                      {isSorted &&
                        (sort.direction === 'desc' ? (
                          <ArrowDown aria-hidden="true" className="mb-px size-3 shrink-0" />
                        ) : (
                          <ArrowUp aria-hidden="true" className="mb-px size-3 shrink-0" />
                        ))}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>

          {teams.map((team, teamIndex) => (
            <tbody key={team.team}>
              <tr>
                <th
                  scope="colgroup"
                  colSpan={table.columns.length + 1}
                  className="[border-block-start:1px_solid_var(--color-line)] py-2 text-left font-normal"
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2 text-13 text-ink-dim">
                      <span
                        aria-hidden="true"
                        className={`h-3.5 w-[3px] shrink-0 rounded-full ${SIDE_TICK[team.team]}`}
                      />
                      <Text
                        path="review.board.started"
                        values={{ side: team.team === 'ct' ? 'CT' : 'T' }}
                      />
                    </span>
                    <span className="numeric text-16 text-ink">{team.score}</span>
                  </span>
                </th>
              </tr>

              {(sorted[teamIndex] ?? []).map((player) => (
                <Row
                  key={player.slot}
                  demo={demo}
                  table={table}
                  player={player}
                  best={best}
                  hasFlashData={hasFlashData}
                  write={write}
                  expandable={expandable}
                />
              ))}
            </tbody>
          ))}
        </table>
      </div>
    </section>
  );
}

interface RowProps {
  demo: ParsedDemo;
  table: PlayerTable;
  player: PlayerStats;
  best: readonly (number | null)[];
  hasFlashData: boolean;
  write: Writer;
  expandable: Props['expandable'];
}

function Row({ demo, table, player, best, hasFlashData, write, expandable }: RowProps) {
  const t = useT();
  const name = demo.header.players.find((entry) => entry.slot === player.slot)?.name ?? '';
  const isOpen = expandable?.opened === player.slot;

  return (
    <>
      <tr
        className={`[border-block-start:1px_solid_var(--color-line)] ${isOpen ? 'bg-selected' : ''}`}
      >
        <td className="h-10 min-w-0 max-w-0 py-0">
          {expandable === undefined ? (
            <span className="block truncate px-1 text-14 text-ink">{name}</span>
          ) : (
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => expandable.onOpen(isOpen ? null : player.slot)}
              className={`flex w-full min-w-0 cursor-pointer rounded-chip px-1 py-1.5 text-left text-14 text-ink transition-colors duration-(--duration-micro) ease-out hover:bg-hover ${FOCUS_RING}`}
            >
              <span className="min-w-0 truncate">{name}</span>
            </button>
          )}
        </td>

        {table.columns.map((column, index) => {
          const value = column.read(player);
          const isUnknown = !hasFlashData && column.needsFlashData === true;
          const isBest = !isUnknown && value !== null && value === best[index];

          return (
            <td
              key={column.id}
              className={`numeric whitespace-nowrap px-2 text-right text-14 ${
                isBest ? 'font-medium text-ink' : 'text-ink-dim'
              }`}
            >
              {isUnknown ? (
                <span title={t('review.stats.unknown')}>
                  <span aria-hidden="true">—</span>
                  <span className="sr-only">{t('review.stats.unknown')}</span>
                </span>
              ) : (
                write(value, column)
              )}
            </td>
          );
        })}
      </tr>

      {isOpen && (
        <tr>
          <td colSpan={table.columns.length + 1} className="pt-1 pb-3">
            <ScoreboardRounds demo={demo} slot={player.slot} />
          </td>
        </tr>
      )}
    </>
  );
}
