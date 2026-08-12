import {
  type ParsedDemo,
  type PlayerInfo,
  type PlayerSlot,
  playerRoundStats,
  type Team,
} from '@disa/demo-core';
import { Text, useT } from '@disa/i18n';
import { PlayerRow } from './PlayerRow';

/** DESIGN.md §5.3 — a side is five rows, and an absent player leaves the row rather than the card. */
const ROWS_PER_SIDE = 5;

interface Props {
  demo: ParsedDemo;
  side: Team;
  players: readonly PlayerInfo[];
  frame: number;
  roundIndex: number | undefined;
  selectedSlot: PlayerSlot | null;
  money: Intl.NumberFormat;
  onSelect: (slot: PlayerSlot) => void;
}

/**
 * One side's five rows — DESIGN.md §5.3. **T is bottom-left and CT is bottom-right**, and which
 * card a player is listed in is one of the two carriers of side identity the plate has left
 * (§2.7), so it is fixed and never configurable.
 *
 * Rows are ordered by slot and never re-sorted while the match plays: a list that re-orders itself
 * under the reader's cursor during playback is the worst thing a live scoreboard can do.
 */
export function TeamCard({
  demo,
  side,
  players,
  frame,
  roundIndex,
  selectedSlot,
  money,
  onSelect,
}: Props) {
  const t = useT();
  const seats = Array.from({ length: ROWS_PER_SIDE }, (_, index) => players.at(index));

  return (
    <section
      aria-label={t('review.team', { side })}
      className="glass-panel flex min-w-0 flex-col gap-1 rounded-float p-3"
    >
      {/* A side's name is game vocabulary — never translated, AGENTS.md §11. */}
      <h2 className={`label-dense ${side === 'CT' ? 'text-ct' : 'text-t'}`}>{side}</h2>

      {/* Below the split the two cards are one strip above the timeline block, so the five seats
          run across it rather than down it — DESIGN.md §5.1. A stacked card there would leave the
          plate a hundred pixels tall, which is the one thing the layout may not do. */}
      <ul className="flex min-w-0 gap-1 split:flex-col split:gap-0">
        {seats.map((player, index) => (
          <li
            // An empty seat has no slot to name it with, and a filled one never moves between
            // seats inside a round.
            key={player === undefined ? `${side}-${index}` : String(player.slot)}
            className="min-w-0 flex-1 split:flex-none"
          >
            {player === undefined ? (
              <p className="px-2 py-1.5 text-13 text-ink-faint">
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
                // Only the expanded row shows them, and only one row is ever expanded — walking a
                // round's events for four rows nobody asked about is a cost with no reader.
                stats={
                  selectedSlot === player.slot
                    ? playerRoundStats(demo, roundIndex, player.slot)
                    : undefined
                }
                money={money}
                onSelect={onSelect}
              />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
