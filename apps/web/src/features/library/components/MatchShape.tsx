import type { OpeningSide } from '@disa/demo-core';

/**
 * How the match went, one cell per round, tinted by the team that won it.
 *
 * **It is the same attribution the score is counted over** — `roundWinners`, which `matchScore`
 * itself walks — so a strip and the numbers beside it cannot disagree. Reading `Round.winner`
 * directly would draw a shape that changes hands at halftime, which is #141 seen from the library.
 *
 * The colours are `--color-ct` and `--color-t`, and that is the rule rather than an exception to it:
 * a hue here means something the demo said. The way in's own background has tokens of its own for
 * exactly the reason this does not need them.
 *
 * **It fills the card's width whatever the match's length**, one row always: a cell is a share of
 * the strip rather than a fixed width, so a 30-round match is a denser bar than a 16-round one and
 * both cards are the same height. The number of rounds is stated in words directly under it, which
 * is the reading a bar's length was never going to carry anyway.
 *
 * It is hidden from a screen reader because the score is already stated beside it, in words a strip
 * of cells cannot improve on — §14's rule about what a mark may be.
 */
export function MatchShape({ winners }: { winners: readonly OpeningSide[] }) {
  // A cell is a round, and a round has a number — that is its identity, and the position it is
  // drawn at is the same fact seen from the other side.
  const rounds = winners.map((winner, index) => ({ number: index + 1, winner }));

  return (
    <span aria-hidden="true" className="flex gap-[2px]">
      {rounds.map((round) => (
        <span
          key={round.number}
          className={`block h-2.5 min-w-0 flex-1 ${round.winner === 'ct' ? 'bg-ct' : 'bg-t'}`}
        />
      ))}
    </span>
  );
}
