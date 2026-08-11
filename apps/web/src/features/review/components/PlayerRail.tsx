import type { PlayerInfo, Team } from '@disa/demo-core';
import { useT } from '@disa/i18n';

/** DESIGN.md §5 — a side is five rows, and an absent player leaves the row rather than the rail. */
const ROWS_PER_SIDE = 5;

interface Seat {
  key: string;
  player: PlayerInfo | undefined;
}

interface Props {
  side: Team;
  players: readonly PlayerInfo[];
}

function seatsFor(side: Team, players: readonly PlayerInfo[]): readonly Seat[] {
  const seats: Seat[] = [];

  for (let index = 0; index < ROWS_PER_SIDE; index++) {
    const player = players.at(index);

    // A row's identity is the seat, not the player: an empty seat has no slot to name it with, and
    // a filled one never moves between seats inside a round.
    seats.push({ key: player === undefined ? `${side}-${index}` : String(player.slot), player });
  }

  return seats;
}

/**
 * One side's roster, on its own half of the screen. The spatial split is the point: DESIGN.md §12
 * ranks rail side above token shape above hue as a carrier of side identity, so this rail is the
 * most reliable of the three and the only one that still works with the map covered.
 *
 * Below the `wide` breakpoint both rails fold into one horizontal strip above the spine — §5 — so
 * every axis here flips rather than being written out twice.
 */
export function PlayerRail({ side, players }: Props) {
  const t = useT();

  return (
    <section
      aria-label={t('review.rail', { side })}
      className="flex min-w-0 flex-1 items-center gap-3 bg-surface-1 px-3 py-2 wide:flex-col wide:items-stretch wide:gap-2 wide:py-3"
    >
      {/* A side's name is game vocabulary — never translated, AGENTS.md §11. */}
      <h2 className="label-dense shrink-0 text-ink-dim">{side}</h2>

      <ul className="flex min-w-0 flex-1 gap-1 wide:w-full wide:flex-none wide:flex-col">
        {seatsFor(side, players).map(({ key, player }) => (
          <li
            key={key}
            aria-hidden={player === undefined}
            className="flex min-w-0 flex-1 items-center gap-2 rounded-card bg-surface-2 px-2 py-1.5 wide:flex-none"
          >
            <span
              aria-hidden="true"
              className={`h-4 w-0.5 shrink-0 rounded-chip ${side === 'CT' ? 'bg-ct' : 'bg-t'}`}
            />

            {player === undefined ? (
              <span className="text-13 text-ink-faint">—</span>
            ) : (
              // Truncation is the last resort §11 allows, and it carries the full name with it.
              <span className="truncate text-13" title={player.name}>
                {player.name}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
