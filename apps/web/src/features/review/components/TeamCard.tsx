import {
  type ParsedDemo,
  type PlayerInfo,
  type PlayerSlot,
  playerRoundStats,
  type Team,
} from '@disa/demo-core';
import { Text, useT } from '@disa/i18n';
import type { MoneyShape } from '../helpers/money';
import { PlayerRow } from './PlayerRow';

/** A side is five rows, and an absent player leaves the row rather than the card. */
const ROWS_PER_SIDE = 5;

interface Props {
  demo: ParsedDemo;
  side: Team;
  players: readonly PlayerInfo[];
  frame: number;
  roundIndex: number | undefined;
  selectedSlot: PlayerSlot | null;
  money: Intl.NumberFormat;
  shape: MoneyShape;
  onSelect: (slot: PlayerSlot) => void;
}

/**
 * One side's five rows. **T is bottom-left and CT is bottom-right**, and which card a player is
 * listed in is one of the two carriers of side identity the plate has left, so it is fixed and
 * never configurable.
 *
 * Rows are ordered by slot and never re-sorted while the match plays: a list that re-orders itself
 * under the reader's cursor during playback is the worst thing a live scoreboard can do.
 *
 * **Nothing here changes size when a row is selected**, which is what lets the plate be sized from
 * this card at all. The row expanded in place for one build and the strip carried a reserved footer
 * below the split to keep the plate still; both are gone — the round's numbers are drawn beside the
 * selected player's own token on the plate, so a selection costs this card no height and the plate
 * measures the same in every state.
 */
export function TeamCard({
  demo,
  side,
  players,
  frame,
  roundIndex,
  selectedSlot,
  money,
  shape,
  onSelect,
}: Props) {
  const t = useT();
  const seats = Array.from({ length: ROWS_PER_SIDE }, (_, index) => players.at(index));

  // Computed for the selected row only, and once for the card rather than once per seat: walking a
  // round's damage for four rows nobody asked about is a cost with no reader.
  const selected =
    selectedSlot !== null && players.some((player) => player.slot === selectedSlot)
      ? playerRoundStats(demo, roundIndex, selectedSlot)
      : undefined;

  return (
    <section
      aria-label={t('review.team', { side })}
      className="surface-card flex min-w-0 flex-col gap-1 rounded-float p-3"
    >
      {/* A side's name is game vocabulary — never translated, AGENTS.md §11. */}
      <h2 className={`label-dense ${side === 'CT' ? 'text-ct' : 'text-t'}`}>{side}</h2>

      {/* Below the split the two cards are one strip above the timeline block, so the five seats
          run across it rather than down it. A stacked card there would leave the plate a hundred
          pixels tall, which is the one thing the layout may not do. */}
      {/* A 2px gap above the split rather than none: the seats were flush, and five adjacent
          health washes with no gap between them fuse into one filled rectangle instead of reading
          as five rows. The gap is what the row's own `rounded-card` needs to be seen at all. */}
      <ul className="flex min-w-0 gap-1 split:flex-col split:gap-0.5">
        {seats.map((player, index) => (
          <li
            // An empty seat has no slot to name it with, and a filled one never moves between
            // seats inside a round.
            key={player === undefined ? `${side}-${index}` : String(player.slot)}
            className="min-w-0 flex-1 split:flex-none"
          >
            {player === undefined ? (
              <p className="px-2 py-1.5 text-13 text-ink-dim">
                <Text path="review.player.empty" />
              </p>
            ) : (
              <PlayerRow
                player={player}
                side={side}
                track={demo.track}
                weapons={demo.header.weapons}
                frame={frame}
                isSelected={selectedSlot === player.slot}
                stats={selectedSlot === player.slot ? selected : undefined}
                money={money}
                shape={shape}
                onSelect={onSelect}
              />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
