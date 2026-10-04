import type { OpeningSide } from '@disa/demo-core';

const HALF = 12;

interface Props {
  winners: readonly OpeningSide[];
  /** The round the reader stopped on, 0-based; every round after it is dimmed. */
  current: number;
}

/**
 * The match as one cell per round, tinted by the team that won it — the same attribution `MatchShape`
 * and the score count over — with the round the reader is on outlined and what is left of the match
 * dimmed. The halves are told apart by a gap rather than a colour.
 */
export function RoundStrip({ winners, current }: Props) {
  return (
    <span aria-hidden="true" className="flex w-full gap-[2px]">
      {winners.map((winner, index) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: a round's position is its identity.
          key={index}
          className={`block h-2 min-w-0 flex-1 rounded-[2px] ${winner === 'ct' ? 'bg-ct' : 'bg-t'} ${
            index > current ? 'opacity-30' : ''
          } ${index === current ? 'outline-2 outline-offset-2 outline-ink' : ''} ${
            index === HALF ? 'ml-1.5' : ''
          }`}
        />
      ))}
    </span>
  );
}
