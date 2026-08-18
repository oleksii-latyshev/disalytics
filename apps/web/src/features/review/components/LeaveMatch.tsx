import { Text } from '@disa/i18n';
import { Button } from '@disa/ui';
import { ArrowLeft } from 'lucide-react';

interface Props {
  onClose: () => void;
}

/**
 * The way out of a match — DESIGN.md §5.2. An arrow pointing back with its label beside it, above
 * the round readout, in the corner the reader already reads for what match they are in.
 *
 * It has moved three times since #147 deleted the top bar it started in: into the corner cluster,
 * which §5.4 had no seat for it in; to the foot of the settings sheet for one day (#151); and here.
 * The 17 August argument was that leaving a match is not a setting — which is true, and is the
 * reason it does not belong *inside* the settings sheet either. **It is a route, and a route is on
 * the screen.**
 *
 * **No glass behind it**, which is the same call the readout below it took on 18 August: a pill over
 * a card over the stage was three surfaces deep in a corner that holds four short lines. It is a
 * text control on the stage, `--ink-dim` at rest and `--ink` on hover or focus, and the padding it
 * keeps for a hover target is pulled back out on the left so the arrow starts on the same edge the
 * map name does.
 *
 * It carries its label rather than the arrow alone: an unlabelled back arrow over a match is the one
 * icon a reader tests by pressing it, and pressing this one costs them their place.
 */
export function LeaveMatch({ onClose }: Props) {
  return (
    <Button
      type="button"
      variant="ghost"
      className="-ml-2.5 text-ink-dim hover:text-ink focus-visible:text-ink"
      onClick={onClose}
    >
      <ArrowLeft aria-hidden="true" />
      <Text path="review.close" />
    </Button>
  );
}
