import { type ParsedDemo, roundIndexAtFrame, roundOpeningFrame } from '@disa/demo-core';
import { useCallback } from 'react';
import { useTransport } from '@/core/playback';
import { useShortcuts } from '@/core/shortcuts';
import { PlaybackControls } from '@/features/controls';
import { MatchRadar } from '@/features/radar';
import { MatchTimeline } from '@/features/timeline';

interface Props {
  demo: ParsedDemo;
}

/** The workspace the match is reviewed in. It owns the transport every panel below reads from. */
export function MatchReview({ demo }: Props) {
  const transport = useTransport(demo);

  const jumpRounds = useCallback(
    (rounds: number) => {
      const current = roundIndexAtFrame(demo, transport.clock.frame);
      const wanted = current === undefined ? 0 : current + rounds;
      const last = demo.events.rounds.length - 1;

      transport.seek(roundOpeningFrame(demo, Math.max(Math.min(wanted, last), 0)));
    },
    [demo, transport],
  );

  // DESIGN.md §9's accessibility floor: the match is operable without a pointer.
  useShortcuts({
    ' ': transport.toggle,
    ',': () => transport.step(-1),
    '.': () => transport.step(1),
    '[': () => jumpRounds(-1),
    ']': () => jumpRounds(1),
  });

  return (
    <div className="flex flex-col gap-4">
      <MatchRadar demo={demo} transport={transport} />
      <MatchTimeline demo={demo} transport={transport} />
      <PlaybackControls track={demo.track} transport={transport} />
    </div>
  );
}
