import { type ParsedDemo, roundIndexAtFrame, roundOpeningFrame } from '@disa/demo-core';
import { useCallback } from 'react';
import type { CacheState } from '@/core/parsing';
import { useTransport } from '@/core/playback';
import { useShortcuts } from '@/core/shortcuts';
import { PlaybackControls } from '@/features/controls';
import { InspectorPanel } from '@/features/inspector';
import { MatchRadar } from '@/features/radar';
import { MatchTimeline } from '@/features/timeline';
import { MatchStrip } from './MatchStrip';

interface Props {
  demo: ParsedDemo;
  fileName: string;
  cache: CacheState;
  onClose: () => void;
}

/** The workspace the match is reviewed in. It owns the transport every panel below reads from. */
export function MatchReview({ demo, fileName, cache, onClose }: Props) {
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

  // The inspector column is bounded rather than fixed: never past a third of the width, so the
  // radar stays dominant, and never below its own content, so a Russian label widens the column
  // instead of being clipped — DESIGN.md §4 and §8.
  return (
    <div className="grid h-dvh grid-cols-[minmax(0,1fr)_minmax(min-content,min(22rem,33%))] grid-rows-[auto_minmax(0,1fr)_auto]">
      <MatchStrip demo={demo} transport={transport} fileName={fileName} onClose={onClose} />

      <MatchRadar demo={demo} transport={transport} />

      <InspectorPanel cache={cache} />

      {/* `border-t` cannot be used anywhere in this app: `--color-t` claims the `t` utility
          namespace, so Tailwind reads it as the Terrorist gold rather than as a top edge. */}
      <div className="col-span-2 flex flex-col gap-3 bg-surface-1 px-4 py-3 shadow-raised [border-block-start:1px_solid_var(--color-line)]">
        <MatchTimeline demo={demo} transport={transport} />
        <PlaybackControls track={demo.track} transport={transport} />
      </div>
    </div>
  );
}
