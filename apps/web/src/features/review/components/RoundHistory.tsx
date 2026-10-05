import type { OpeningSide, RoundSummary } from '@disa/demo-core';
import { Text, useT } from '@disa/i18n';
import { BUY_LEGEND, BUY_NAME_KEYS, BUY_SHORT_KEYS, REASON_KEYS } from '../helpers/round-copy';
import { RoundReasonIcon } from './RoundReasonIcon';
import { TeamTag } from './TeamTag';

interface Props {
  rounds: readonly RoundSummary[];
  selected: number;
  onSelect: (roundIndex: number) => void;
}

/* The rows of one round's column and of the label column beside it share this template, so a label
   stands level with what it names whatever the width. */
const ROWS = 'grid grid-rows-[1rem_1.875rem_1rem_1.875rem_1rem] items-center';
const SIDE_INK = { CT: 'text-ct', T: 'text-t' } as const;

function Cell({
  round,
  team,
  isSelected,
}: {
  round: RoundSummary;
  team: OpeningSide;
  isSelected: boolean;
}) {
  const isWon = round.winner === team;

  return (
    <span
      className={`grid h-[1.625rem] place-items-center rounded-chip border ${
        isWon ? 'bg-surface-2' : 'bg-transparent'
      } ${
        isSelected
          ? isWon
            ? 'border-ink'
            : 'border-line-strong'
          : isWon
            ? 'border-line-soft'
            : 'border-transparent'
      }`}
    >
      {isWon && round.winnerSide !== null && (
        <RoundReasonIcon
          reason={round.reason}
          className={`size-3.5 ${SIDE_INK[round.winnerSide]}`}
        />
      )}
    </span>
  );
}

function BuyMark({ round, team }: { round: RoundSummary; team: OpeningSide }) {
  const buy = round.buys[team];
  const t = useT();

  return (
    <span
      title={buy === null ? undefined : t(BUY_NAME_KEYS[buy])}
      className={`text-center font-mono text-10 ${
        buy === 'full' || buy === 'pistol' ? 'text-ink' : 'text-ink-faint'
      }`}
    >
      {buy === null ? '·' : t(BUY_SHORT_KEYS[buy])}
    </span>
  );
}

/**
 * Every round of the match in two rows, one per team, with what each team bought above and below.
 *
 * **A round is one button** spanning all five rows, so the strip is one tab stop per round and a
 * hover, a focus or a press anywhere in the column says which round the line under it describes.
 * A win is a mark for how it was won, drawn in the colour of the side the winner held that round;
 * the loser's cell stays empty. A gap follows each half.
 */
export function RoundHistory({ rounds, selected, onSelect }: Props) {
  const t = useT();

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex min-w-0 gap-3">
        <div aria-hidden="true" className={`${ROWS} shrink-0 text-12 text-ink-dim`}>
          <span className="text-11">
            <Text path="review.stats.history.buy" />
          </span>
          <TeamTag team="ct" />
          <span />
          <TeamTag team="t" />
          <span className="text-11">
            <Text path="review.stats.history.buy" />
          </span>
        </div>

        <ul
          aria-label={t('review.stats.history.title')}
          className="m-0 flex min-w-0 flex-1 list-none p-0"
        >
          {rounds.map((round) => {
            const isSelected = round.roundIndex === selected;
            const label =
              round.winnerSide === null
                ? t('review.stats.history.roundDraw', { round: round.number })
                : t('review.stats.history.roundWon', {
                    round: round.number,
                    side: round.winnerSide,
                    reason: t(REASON_KEYS[round.reason]),
                  });

            return (
              <li
                key={round.number}
                className={`min-w-0 flex-1 px-px ${round.endsHalf ? 'mr-2' : ''}`}
              >
                <button
                  type="button"
                  aria-label={label}
                  aria-pressed={isSelected}
                  onMouseEnter={() => onSelect(round.roundIndex)}
                  onFocus={() => onSelect(round.roundIndex)}
                  onClick={() => onSelect(round.roundIndex)}
                  className={`${ROWS} w-full cursor-pointer rounded-chip focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus`}
                >
                  <BuyMark round={round} team="ct" />
                  <Cell round={round} team="ct" isSelected={isSelected} />
                  <span
                    className={`text-center font-mono text-10 ${isSelected ? 'text-ink' : 'text-ink-faint'}`}
                  >
                    {round.number}
                  </span>
                  <Cell round={round} team="t" isSelected={isSelected} />
                  <BuyMark round={round} team="t" />
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-11 text-ink-faint">
        <span>
          <Text path="review.stats.history.legend" />
        </span>
        <span className="font-mono">
          {BUY_LEGEND.map((buy, index) => (
            <span key={buy}>
              {index > 0 && ' · '}
              {t(BUY_SHORT_KEYS[buy])} {t(BUY_NAME_KEYS[buy])}
            </span>
          ))}
        </span>
      </div>
    </div>
  );
}
