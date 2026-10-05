import type { ParsedDemo, PlayerSlot, PlayerStats, TeamPlayerStats } from '@disa/demo-core';
import { Text, useT } from '@disa/i18n';
import { ChevronDown } from 'lucide-react';
import { useMemo } from 'react';
import {
  barScale,
  bestValue,
  type PlayerColumn,
  type PlayerColumnSet,
  sortByRating,
} from '../helpers/player-table';
import type { StatWriter } from '../helpers/stat-writer';
import { PlayerDetail, type PlayerViewLink } from './PlayerDetail';
import { TeamTag } from './TeamTag';

interface Props {
  demo: ParsedDemo;
  set: PlayerColumnSet;
  teams: readonly [TeamPlayerStats, TeamPlayerStats];
  /** False when the recording has no flash events, which makes those figures unknown, not zero. */
  hasFlashData: boolean;
  write: StatWriter;
  opened: PlayerSlot | null;
  onOpen: (slot: PlayerSlot | null) => void;
  onWatchRound: (roundIndex: number) => void;
  onPlayerView: PlayerViewLink;
}

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus';

/**
 * Both teams in one table, each by rating, in whichever set of columns the reader picked.
 *
 * **The best figure in a column is the brighter one**, across all ten players: ink against
 * `ink-dim` and a step of weight, never a hue, because colour here belongs to the side. A bar
 * repeats the figure of the two columns that read as a share of the best (rating, utility damage).
 * Pressing a player opens the row under them; at most one stands open.
 */
export function PlayerStatsTable({
  demo,
  set,
  teams,
  hasFlashData,
  write,
  opened,
  onOpen,
  onWatchRound,
  onPlayerView,
}: Props) {
  const t = useT();
  const everyone = useMemo(() => teams.flatMap((team) => team.players), [teams]);
  const sorted = useMemo(() => teams.map((team) => sortByRating(team.players)), [teams]);
  const columns = useMemo(
    () =>
      set.columns.map((column) => {
        const isUnknown = !hasFlashData && column.needsFlashData === true;
        return {
          column,
          isUnknown,
          best: isUnknown ? null : bestValue(everyone, column),
          scale: column.bar === true ? barScale(everyone, column) : 0,
        };
      }),
    [set.columns, hasFlashData, everyone],
  );

  return (
    <div className="overflow-x-auto px-4 pb-2">
      <table className="w-full border-collapse text-14">
        <thead>
          <tr className="text-12 text-ink-dim">
            <th scope="col" className="w-full min-w-[9rem] pt-2 pb-2 text-left font-normal">
              <Text path="review.board.player" />
            </th>

            {set.columns.map((column) => (
              <th
                key={column.id}
                scope="col"
                title={headerTitle(column, t)}
                className="px-2 pt-2 pb-2 text-right align-bottom font-normal leading-dense"
              >
                {t(column.labelPath, column.labelValues)}
              </th>
            ))}
          </tr>
        </thead>

        {teams.map((team, teamIndex) => (
          <tbody key={team.team}>
            <tr>
              <th
                scope="colgroup"
                colSpan={set.columns.length + 1}
                className="[border-block-start:1px_solid_var(--color-line)] py-2 text-left font-normal"
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="text-13 text-ink-dim">
                    <TeamTag team={team.team} />
                  </span>
                  <span className="numeric text-16 text-ink">{team.score}</span>
                </span>
              </th>
            </tr>

            {(sorted[teamIndex] ?? []).map((player) => (
              <Row
                key={player.slot}
                demo={demo}
                columns={columns}
                player={player}
                write={write}
                isOpen={opened === player.slot}
                onOpen={onOpen}
                onWatchRound={onWatchRound}
                onPlayerView={onPlayerView}
                columnCount={set.columns.length + 1}
              />
            ))}
          </tbody>
        ))}
      </table>
    </div>
  );
}

function headerTitle(column: PlayerColumn, t: ReturnType<typeof useT>): string | undefined {
  if (column.nameTitlePath !== undefined) return t(column.nameTitlePath);
  if (column.id.startsWith('multi') && column.labelValues !== undefined) {
    return t('review.stats.players.col.multiName', column.labelValues);
  }
  return undefined;
}

interface ColumnState {
  readonly column: PlayerColumn;
  readonly isUnknown: boolean;
  readonly best: number | null;
  readonly scale: number;
}

interface RowProps {
  demo: ParsedDemo;
  columns: readonly ColumnState[];
  columnCount: number;
  player: PlayerStats;
  write: StatWriter;
  isOpen: boolean;
  onOpen: (slot: PlayerSlot | null) => void;
  onWatchRound: (roundIndex: number) => void;
  onPlayerView: PlayerViewLink;
}

function Row({
  demo,
  columns,
  columnCount,
  player,
  write,
  isOpen,
  onOpen,
  onWatchRound,
  onPlayerView,
}: RowProps) {
  const t = useT();
  const name = demo.header.players.find((entry) => entry.slot === player.slot)?.name ?? '';

  return (
    <>
      <tr
        className={`[border-block-start:1px_solid_var(--color-line)] ${isOpen ? 'bg-selected' : ''}`}
      >
        <td className="h-11 min-w-0 py-0">
          <button
            type="button"
            aria-expanded={isOpen}
            onClick={() => onOpen(isOpen ? null : player.slot)}
            className={`flex w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-chip px-1 py-1.5 text-left text-14 text-ink transition-colors duration-(--duration-micro) ease-out hover:bg-hover ${FOCUS_RING}`}
          >
            <span className="min-w-0 break-words">{name}</span>
            <ChevronDown
              aria-hidden="true"
              className={`size-3.5 shrink-0 text-ink-faint transition-transform duration-(--duration-micro) ease-out ${
                isOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
        </td>

        {columns.map(({ column, isUnknown, best, scale }) => {
          const value = column.read(player);
          const isBest = !isUnknown && value !== null && value === best;

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
                <span className="inline-flex items-center justify-end gap-2">
                  {column.bar === true && scale > 0 && (
                    <span
                      aria-hidden="true"
                      className="h-1 w-14 overflow-hidden rounded-full bg-surface-3"
                    >
                      <span
                        className={`block h-full rounded-full ${isBest ? 'bg-ink' : 'bg-ink-faint'}`}
                        style={{ width: `${((value ?? 0) / scale) * 100}%` }}
                      />
                    </span>
                  )}
                  {write(value, column.format)}
                </span>
              )}
            </td>
          );
        })}
      </tr>

      {isOpen && (
        <tr>
          <td colSpan={columnCount} className="pt-1 pb-3">
            <PlayerDetail
              demo={demo}
              player={player}
              write={write}
              onWatchRound={onWatchRound}
              onPlayerView={onPlayerView}
            />
          </td>
        </tr>
      )}
    </>
  );
}
