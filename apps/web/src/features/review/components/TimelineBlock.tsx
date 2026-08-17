import type { ParsedDemo, PlayerSlot } from '@disa/demo-core';
import type { Transport } from '@/core/playback';
import { PlaybackControls, SpeedControl } from '@/features/controls';
import { RoundStrip, RoundTimeline } from '@/features/timeline';
import { Scoreboard } from './Scoreboard';

interface Props {
  demo: ParsedDemo;
  transport: Transport;
  selectedSlot: PlayerSlot | null;
  frame: number;
  locale: string;
  hasScoreboard: boolean;
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
 *
 * **The scoreboard's brow is part of this block** (§5.2) and is in flow above it rather than over
 * the plate: the 32px are the block's own height, so §5.1's plate re-measures from 124px instead of
 * 92px and nothing is covered. Sending it over the plate instead is the reader's other position, and
 * the block goes back to 92px when they take it.
 */
export function TimelineBlock({
  demo,
  transport,
  selectedSlot,
  frame,
  locale,
  hasScoreboard,
}: Props) {
  return (
    <div className="flex flex-col">
      {hasScoreboard && (
        // `z-1` is the join rather than a layer: the block's own hair runs in the 1px row directly
        // above its top edge, which is the brow's last row, and a later-painting sibling would draw
        // it straight across the join §5.2 asks to keep clean. The strip's tooltip is `z-10` and
        // still hangs over this.
        <div className="relative z-1 flex justify-center">
          <Scoreboard demo={demo} frame={frame} locale={locale} position="brow" />
        </div>
      )}

      <section
        className={`glass-panel flex flex-col rounded-float ${hasScoreboard ? 'has-brow' : ''}`}
      >
        <RoundStrip demo={demo} transport={transport} />

        {/* 64px: the 40px primary button plus 12px either side, which is §5.5's control row and has
            no slack left in it. */}
        <div className="flex min-w-0 items-center gap-4 px-4 py-3">
          <PlaybackControls track={demo.track} transport={transport} />

          <RoundTimeline demo={demo} transport={transport} selectedSlot={selectedSlot} />

          <SpeedControl transport={transport} />
        </div>
      </section>
    </div>
  );
}
