import type { OpeningSide } from '@disa/demo-core';
import { Text } from '@disa/i18n';

const SIDE_TICK = { ct: 'bg-ct', t: 'bg-t' } as const;

/**
 * A team by the only name the demo gives it: the side it started on. The tick is that side's
 * colour, so the colour says which side the team opened on and never which team it is.
 */
export function TeamTag({ team }: { team: OpeningSide }) {
  return (
    <span className="flex min-w-0 items-center gap-2 whitespace-nowrap">
      <span
        aria-hidden="true"
        className={`h-3.5 w-[3px] shrink-0 rounded-full ${SIDE_TICK[team]}`}
      />
      <Text path="review.board.started" values={{ side: team === 'ct' ? 'CT' : 'T' }} />
    </span>
  );
}
