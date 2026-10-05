import type { RoundWinReason } from '@disa/demo-core';
import { Bomb, Clock, ShieldCheck, Skull } from 'lucide-react';

/** How a round was won, drawn as a mark: elimination, the bomb going off, a defuse, the clock. */
export function RoundReasonIcon({
  reason,
  className,
}: {
  reason: RoundWinReason;
  className: string;
}) {
  switch (reason) {
    case 'bomb-exploded':
      return <Bomb aria-hidden="true" className={className} />;
    case 'bomb-defused':
      return <ShieldCheck aria-hidden="true" className={className} />;
    case 'time-expired':
      return <Clock aria-hidden="true" className={className} />;
    case 'all-ct-eliminated':
    case 'all-t-eliminated':
      return <Skull aria-hidden="true" className={className} />;
    case 'draw':
      return null;
  }
}
