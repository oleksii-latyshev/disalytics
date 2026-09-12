import { type ParsedDemo, type PlayerSlot, playerRoundStats } from '@disa/demo-core';
import { Text, useT } from '@disa/i18n';
import { useMemo } from 'react';

interface Props {
  demo: ParsedDemo;
  slot: PlayerSlot;
}

/**
 * What one player did in each round of the match, under the row that adds it up.
 *
 * **It is derived for the opened row only**, which is #147's rule for `playerRoundStats` arriving on
 * another screen: walking a match's kills and damage for ten rows nobody opened is the cost that
 * avoids, and each call starts from a binary search rather than from the first event of the match.
 *
 * The cells wrap rather than scroll. A strip of twenty-four is wider than this screen at every
 * width the product supports, and a reading that has to be scrolled sideways to be counted is one
 * the reader will not count.
 */
export function ScoreboardRounds({ demo, slot }: Props) {
  const t = useT();

  const rounds = useMemo(
    () =>
      demo.events.rounds.map((round, index) => ({
        number: round.number,
        ...playerRoundStats(demo, index, slot),
      })),
    [demo, slot],
  );

  return (
    <ul aria-label={t('review.board.detail')} className="flex list-none flex-wrap gap-1">
      {rounds.map((round) => (
        <li
          key={round.number}
          className="flex min-w-[3rem] flex-col items-center gap-0.5 rounded-chip bg-surface-2 px-1.5 py-1"
        >
          <span className="sr-only">
            <Text
              path="review.board.roundLine"
              values={{ round: round.number, kills: round.kills, damage: round.damage }}
            />
          </span>

          <span aria-hidden className="label-dense text-ink-faint">
            {round.number}
          </span>

          {/* A round nobody killed anybody in is the common case, so a zero is dimmed rather than
              drawn at the strength of the number beside it. */}
          <span
            aria-hidden
            className={`numeric text-13 ${round.kills > 0 ? 'text-ink' : 'text-ink-dim'}`}
          >
            {round.kills}
          </span>

          <span aria-hidden className="numeric text-11 text-ink-dim">
            {round.damage}
          </span>
        </li>
      ))}
    </ul>
  );
}
