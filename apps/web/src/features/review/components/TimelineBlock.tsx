import type { ParsedDemo, PlayerSlot } from '@disa/demo-core';
import type { Transport } from '@/core/playback';
import { PlaybackControls, SpeedControl } from '@/features/controls';
import { RoundStrip, RoundTimeline } from '@/features/timeline';

interface Props {
  demo: ParsedDemo;
  transport: Transport;
  selectedSlot: PlayerSlot | null;
}

/**
 * The bottom of the screen — DESIGN.md §5.5. The round strip on top, then play/pause, the round
 * timeline and the speed control on one line. 92px for the whole job, or 108px with the strip's
 * survivor tracks expanded, where the layout it replaces spent 205px on it.
 *
 * **The strip is the top row now.** It was flush to the card's bottom edge until #190, which put it
 * as far from the axis it seeks against as the card allowed; the reader's path is *pick a round,
 * then watch it*, and the two rows are adjacent for that reason. The pills carry their own gaps, so
 * the strip is padded like the row beneath it rather than running edge to edge.
 *
 * The card no longer clips its overflow, which the flush strip needed to keep square cells out of a
 * 16px radius. Nothing bleeds into a corner now, and a pill's tooltip hangs above the block over the
 * stage rather than being cut off by the card it sits in — §2.3's tooltip case, alpha and no blur.
 */
export function TimelineBlock({ demo, transport, selectedSlot }: Props) {
  return (
    <section className="glass-panel flex flex-col rounded-float">
      <RoundStrip demo={demo} transport={transport} />

      {/* 64px: the 40px primary button plus 12px either side, which is §5.5's control row and has
          no slack left in it. */}
      <div className="flex min-w-0 items-center gap-4 px-4 py-3">
        <PlaybackControls track={demo.track} transport={transport} />

        <RoundTimeline demo={demo} transport={transport} selectedSlot={selectedSlot} />

        <SpeedControl transport={transport} />
      </div>
    </section>
  );
}
