import type { HeadToHead, PlayerInfo, PlayerSlot } from '@disa/demo-core';
import { Text, useT } from '@disa/i18n';
import type { DuelNarrowing } from '../helpers/map-scope';

interface Props {
  /** The team shown down the side, and the one across the top; each is a team's players. */
  rows: readonly PlayerInfo[];
  columns: readonly PlayerInfo[];
  rowSide: string;
  columnSide: string;
  /** Counted over the mode's duels, so the grid follows the mode and not the filter it sets. */
  duels: HeadToHead;
  narrowing: DuelNarrowing;
  onPlayer: (slot: PlayerSlot) => void;
  onPair: (row: PlayerSlot, column: PlayerSlot) => void;
}

/** What a cell's ground gives up to the busiest one's, so luminance reads as how many. */
const LUMINANCE_FLOOR = 3;
const LUMINANCE_SPAN = 14;

const HEAD_CLASS =
  'h-8 min-w-0 truncate rounded-chip border px-1 text-12 transition-colors duration-(--duration-micro) ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus';

function headClass(isOn: boolean): string {
  return `${HEAD_CLASS} ${isOn ? 'border-ink bg-ink font-semibold text-surface-0' : 'border-line text-ink-dim hover:text-ink'}`;
}

function figureClass(own: number, other: number): string {
  if (own === 0) return 'text-ink-faint';

  return own > other ? 'font-semibold text-ink' : 'text-ink-dim';
}

/**
 * Who killed whom, as the 5×5 grid the match's two teams make — #568. A cell reads "row killed :
 * column killed" with the larger figure set heavier, and its ground is lighter the more duels the
 * two had between them. **Luminance only**: a side's hue belongs to the map, not to this.
 *
 * It is also the filter: a cell is a pair, a name is a player, and both are toggles. A name or a
 * cell that is not in the filter drops back rather than leaving, so the grid never reshuffles under
 * the pointer.
 */
export function DuelGrid({
  rows,
  columns,
  rowSide,
  columnSide,
  duels,
  narrowing,
  onPlayer,
  onPair,
}: Props) {
  const t = useT();

  let busiest = 0;
  for (const row of rows) {
    for (const column of columns) {
      busiest = Math.max(
        busiest,
        duels.killed(row.slot, column.slot) + duels.killed(column.slot, row.slot),
      );
    }
  }

  const [pairRow, pairColumn] = narrowing.pair ?? [];

  return (
    <div className="flex flex-col gap-1.5">
      <p className="flex items-baseline justify-between gap-2">
        <span className="label-dense text-ink-dim">
          <Text path="review.duels.grid.title" />
        </span>
        <span className="text-12 text-ink-faint">
          <Text path="review.duels.grid.hint" />
        </span>
      </p>

      <div className="grid grid-cols-[minmax(0,4.5rem)_repeat(5,minmax(0,1fr))] gap-[3px]">
        <span className="self-end pb-1 text-12 text-ink-faint">
          <Text path="review.duels.grid.team" values={{ side: rowSide }} /> ↓
        </span>

        {columns.map((column) => (
          <button
            key={column.slot}
            type="button"
            title={column.name}
            aria-pressed={narrowing.player === column.slot}
            onClick={() => onPlayer(column.slot)}
            className={headClass(narrowing.player === column.slot)}
          >
            {column.name}
          </button>
        ))}

        {rows.map((row) => (
          <div key={row.slot} className="contents">
            <button
              type="button"
              title={row.name}
              aria-pressed={narrowing.player === row.slot}
              onClick={() => onPlayer(row.slot)}
              className={`${headClass(narrowing.player === row.slot)} text-left`}
            >
              {row.name}
            </button>

            {columns.map((column) => {
              const won = duels.killed(row.slot, column.slot);
              const lost = duels.killed(column.slot, row.slot);
              const isOn = pairRow === row.slot && pairColumn === column.slot;
              const isAside =
                narrowing.player !== null &&
                narrowing.player !== row.slot &&
                narrowing.player !== column.slot;
              const share = busiest === 0 ? 0 : (won + lost) / busiest;

              return (
                <button
                  key={column.slot}
                  type="button"
                  aria-pressed={isOn}
                  aria-label={t('review.duels.grid.cell', {
                    attacker: row.name,
                    victim: column.name,
                    a: won,
                    b: lost,
                  })}
                  onClick={() => onPair(row.slot, column.slot)}
                  style={{
                    backgroundColor: `color-mix(in srgb, var(--color-ink) ${LUMINANCE_FLOOR + share * LUMINANCE_SPAN}%, transparent)`,
                  }}
                  className={`numeric flex h-8 items-center justify-center gap-px rounded-chip border text-12 transition-opacity duration-(--duration-micro) ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
                    isOn ? 'border-ink' : 'border-transparent'
                  } ${isAside ? 'opacity-35' : ''}`}
                >
                  <span className={figureClass(won, lost)}>{won}</span>
                  <span className="text-ink-faint">:</span>
                  <span className={figureClass(lost, won)}>{lost}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <p className="text-right text-12 text-ink-faint">
        <Text path="review.duels.grid.team" values={{ side: columnSide }} /> →
      </p>
    </div>
  );
}
