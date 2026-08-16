import type { ParsedDemo, PlayerSlot } from '@disa/demo-core';
import type { Transport } from '@/core/playback';
import { PlaybackControls, SpeedControl } from '@/features/controls';
import { RoundList, RoundTimeline } from '@/features/timeline';

interface Props {
  demo: ParsedDemo;
  transport: Transport;
  selectedSlot: PlayerSlot | null;
}

/**
 * The bottom of the screen — DESIGN.md §5.5. Play/pause, the round timeline and the speed control
 * on one line, with the round list flush to the card's bottom edge beneath them. 96px for the whole
 * job, where the layout it replaces spent 205px on it.
 *
 * The list runs edge to edge inside the card and the row above it is padded, which is what makes
 * the strip read as part of the card rather than as a fifth panel: `overflow-hidden` is what lets a
 * row of square cells sit inside a 16px radius without a corner cutting through them.
 */
export function TimelineBlock({ demo, transport, selectedSlot }: Props) {
  return (
    <section className="glass-panel flex h-24 flex-col overflow-hidden rounded-float">
      <div className="flex min-w-0 flex-1 items-center gap-4 px-4">
        <PlaybackControls track={demo.track} transport={transport} />

        <RoundTimeline demo={demo} transport={transport} selectedSlot={selectedSlot} />

        <SpeedControl transport={transport} />
      </div>

      <RoundList demo={demo} transport={transport} />
    </section>
  );
}
