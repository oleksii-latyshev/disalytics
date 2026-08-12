import type { ParsedDemo } from '@disa/demo-core';
import type { Transport } from '@/core/playback';
import { PlaybackControls, SpeedControl } from '@/features/controls';
import { MatchRibbon, RoundTimeline } from '@/features/timeline';

interface Props {
  demo: ParsedDemo;
  transport: Transport;
}

/**
 * The bottom of the screen — DESIGN.md §5.5. Play/pause, the round timeline and the speed control
 * on one line, with the match ribbon flush to the card's bottom edge beneath them. 96px for the
 * whole job, where the layout it replaces spent 205px on it.
 *
 * The ribbon runs edge to edge inside the card and the row above it is padded, which is what makes
 * the strip read as part of the card rather than as a fifth panel: `overflow-hidden` is what lets
 * a 14px canvas sit inside a 16px radius without a corner cutting through it.
 */
export function TimelineBlock({ demo, transport }: Props) {
  return (
    <section className="glass-panel flex h-24 flex-col overflow-hidden rounded-float">
      <div className="flex min-w-0 flex-1 items-center gap-4 px-4">
        <PlaybackControls track={demo.track} transport={transport} />

        <RoundTimeline demo={demo} transport={transport} />

        <SpeedControl transport={transport} />
      </div>

      <MatchRibbon demo={demo} transport={transport} />
    </section>
  );
}
