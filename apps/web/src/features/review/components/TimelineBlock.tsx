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
  /** Whether §9.3's stillness has sent the block off the bottom of the screen. */
  isAway: boolean;
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
 *
 * **In fullscreen it leaves after three seconds of stillness** and the bottom 80px brings it back —
 * `docs/DESIGN.md` §9.3, and `useHotCorners` is what decides. Out of fullscreen it never hides.
 */
export function TimelineBlock({
  demo,
  transport,
  selectedSlot,
  frame,
  locale,
  hasScoreboard,
  isAway,
}: Props) {
  return (
    // §9.3's auto-hide, and it **keeps its space**: the cell's height is what §5.1 subtracts from
    // the plate's axis, so a block that collapsed would resize the plate under the reader in the
    // middle of a round. It leaves by `translate` and `opacity` and by nothing else — hard rule 9,
    // and `translate` is the individual transform property Tailwind's `translate-y-*` actually
    // writes: naming `transform` in the transition list leaves the slide to snap while the fade
    // runs, which looks like a working animation until it is measured. The stage clips the box it
    // slides into. `opacity` rather than the slide alone is what
    // hides it: the stage's bottom padding is shorter than the block, so a 100% slide leaves a strip
    // of it in the very band that reveals it. It takes no pointer while it is away, and keeps every
    // control reachable by `Tab` — which is what brings it back. `prefers-reduced-motion` and
    // §10.5's motion row are the global reset's, which takes the duration to zero and leaves the
    // reveal instant rather than absent.
    <div
      className={`flex flex-col transition-[translate,opacity] duration-(--duration-base) ease-out ${
        isAway ? 'pointer-events-none translate-y-full opacity-0' : ''
      }`}
    >
      {hasScoreboard && (
        // `z-1` is the join rather than a layer: the block's own hair runs in the 1px row directly
        // above its top edge, which is the brow's last row, and a later-painting sibling would draw
        // it straight across the join §5.2 asks to keep clean. The strip's tooltip is `z-10` and
        // still hangs over this.
        <div className="relative z-1 flex justify-center">
          <Scoreboard demo={demo} frame={frame} locale={locale} position="brow" />
        </div>
      )}

      <section className="surface-card flex flex-col rounded-float">
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
