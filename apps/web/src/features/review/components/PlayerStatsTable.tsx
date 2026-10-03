import type { ParsedDemo, PlayerSlot, PlayerStats, TeamPlayerStats } from '@disa/demo-core';
import { Text, useLocale, useT } from '@disa/i18n';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { useMemo } from 'react';
import {
  PLAYER_COLUMNS,
  type PlayerColumn,
  type PlayerSort,
  sortPlayers,
} from '../helpers/player-table';
import { ScoreboardRounds } from './ScoreboardRounds';

interface Props {
  demo: ParsedDemo;
  team: TeamPlayerStats;
  /** False when the recording has no flash events, which makes FA and BT unknown rather than zero. */
  hasFlashData: boolean;
  sort: PlayerSort | null;
  onSort: (column: PlayerColumn['id']) => void;
  /** The row standing open, which is at most one across both teams. */
  opened: PlayerSlot | null;
  onOpen: (slot: PlayerSlot | null) => void;
}

const FLASH_COLUMNS: ReadonlySet<PlayerColumn['id']> = new Set(['flashAssists', 'blind']);

const SIDE_INK = { ct: 'text-ct', t: 'text-t' } as const;

type Writer = (player: PlayerStats, column: PlayerColumn) => string;

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

    return (player, column) => {
      const value = column.read(player);

      switch (column.format) {
        case 'signed':
          return signed(value);
        case 'percent':
          return `${integer.format(value)}%`;
        case 'decimal1':
          return decimal1.format(value);
        case 'decimal2':
          return decimal2.format(value);
        case 'record':
          return `${player.openingWon}–${player.openingLost}`;
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

/**
 * One team's players and every figure `matchPlayerStats` states for them.
 *
 * **A heading is a button** because the order is the reader's to change, and a press on a native
 * button is the one interaction that is keyboard first for free. The rows move; the table's own
 * order — the one the scoreboard lists a team in — is what a third press returns to.
 */
export function PlayerStatsTable({
  demo,
  team,
  hasFlashData,
  sort,
  onSort,
  opened,
  onOpen,
}: Props) {
  const t = useT();
  const write = useWriter();
  const side = team.team === 'ct' ? 'CT' : 'T';
  const players = useMemo(() => sortPlayers(team.players, sort), [team.players, sort]);

  return (
    <section
      aria-label={t('review.board.started', { side })}
      className="surface-card flex min-w-0 flex-col gap-2 rounded-float p-3"
    >
      <header className="flex items-baseline justify-between gap-3">
        <h2 className={`label-dense ${SIDE_INK[team.team]}`}>
          <Text path="review.board.started" values={{ side }} />
        </h2>

        <p className="numeric text-16 text-ink">{team.score}</p>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-13">
          <thead>
            <tr className="text-ink-dim">
              <th scope="col" className="w-full min-w-[7rem] pt-3 pb-1 text-left font-normal">
                <span className="sr-only">
                  <Text path="review.board.player" />
                </span>
              </th>

              {PLAYER_COLUMNS.map((column) => {
                const name = t(column.namePath, column.nameValues);
                const isUnknown = !hasFlashData && FLASH_COLUMNS.has(column.id);
                const isSorted = sort?.column === column.id;

                return (
                  <th
                    key={column.id}
                    scope="col"
                    aria-sort={ariaSortOf(sort, column)}
                    className="px-0 pt-3 pb-1 text-right font-normal"
                  >
                    <button
                      type="button"
                      title={name}
                      disabled={isUnknown}
                      onClick={() => onSort(column.id)}
                      className={`label-dense relative cursor-pointer whitespace-nowrap rounded-chip px-1.5 py-0.5 transition-colors duration-(--duration-micro) ease-out hover:text-ink disabled:cursor-default disabled:hover:text-ink-dim focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
                        isSorted ? 'text-ink' : ''
                      }`}
                    >
                      {isSorted &&
                        (sort.direction === 'desc' ? (
                          <ArrowDown
                            aria-hidden="true"
                            className="-translate-x-1/2 absolute top-[-0.5rem] left-1/2 size-2.5"
                          />
                        ) : (
                          <ArrowUp
                            aria-hidden="true"
                            className="-translate-x-1/2 absolute top-[-0.5rem] left-1/2 size-2.5"
                          />
                        ))}

                      <span aria-hidden="true">
                        {column.abbrLiteral ??
                          (column.abbrPath === undefined ? '' : t(column.abbrPath))}
                      </span>
                      <span className="sr-only">{name}</span>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {players.map((player) => (
              <Row
                key={player.slot}
                demo={demo}
                player={player}
                name={demo.header.players.find((entry) => entry.slot === player.slot)?.name ?? ''}
                isOpen={opened === player.slot}
                onOpen={onOpen}
                write={write}
                hasFlashData={hasFlashData}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

interface RowProps {
  demo: ParsedDemo;
  player: PlayerStats;
  name: string;
  isOpen: boolean;
  onOpen: (slot: PlayerSlot | null) => void;
  write: Writer;
  hasFlashData: boolean;
}

function Row({ demo, player, name, isOpen, onOpen, write, hasFlashData }: RowProps) {
  const t = useT();

  return (
    <>
      <tr className={isOpen ? 'bg-selected' : undefined}>
        <td className="min-w-0 py-0.5">
          <button
            type="button"
            aria-expanded={isOpen}
            onClick={() => onOpen(isOpen ? null : player.slot)}
            className="flex w-full min-w-0 cursor-pointer rounded-chip px-1 py-0.5 text-left text-ink transition-colors duration-(--duration-micro) ease-out hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            <span className="min-w-0 truncate">{name}</span>
          </button>
        </td>

        {PLAYER_COLUMNS.map((column) => (
          <td
            key={column.id}
            className={`numeric whitespace-nowrap px-1.5 py-0.5 text-right ${
              column.id === 'rating' ? 'font-medium text-ink' : 'text-ink'
            }`}
          >
            {!hasFlashData && FLASH_COLUMNS.has(column.id) ? (
              <span title={t('review.stats.unknown')}>
                <span aria-hidden="true">—</span>
                <span className="sr-only">{t('review.stats.unknown')}</span>
              </span>
            ) : (
              write(player, column)
            )}
          </td>
        ))}
      </tr>

      {isOpen && (
        <tr>
          <td colSpan={PLAYER_COLUMNS.length + 1} className="pt-1 pb-2">
            <ScoreboardRounds demo={demo} slot={player.slot} />
          </td>
        </tr>
      )}
    </>
  );
}
