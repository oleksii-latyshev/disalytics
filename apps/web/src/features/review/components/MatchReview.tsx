import {
  type ParsedDemo,
  type PlayerSlot,
  playersOnSide,
  roundIndexAtFrame,
  roundOpeningFrame,
  sidesBySlotAtRound,
} from '@disa/demo-core';
import { useLocale } from '@disa/i18n';
import { m } from '@disa/ui';
import { useCallback, useMemo, useRef, useState } from 'react';
import type { KillLine } from '@/core/events';
import { assembly } from '@/core/motion';
import type { CacheState } from '@/core/parsing';
import { useBuyPhaseSkip, useFrameReadout, useTransport } from '@/core/playback';
import { useSetting } from '@/core/settings';
import { MatchRadar } from '@/features/radar';
import { useFullscreen } from '@/shared/hooks';
import { createMoneyFormat } from '../helpers/money';
import { useHotCorners } from '../hooks/use-hot-corners';
import { useReviewSheets } from '../hooks/use-review-sheets';
import { useReviewShortcuts } from '../hooks/use-review-shortcuts';
import { CornerCluster } from './CornerCluster';
import { EventFeed } from './EventFeed';
import { LeaveMatch } from './LeaveMatch';
import { MatchIdentity } from './MatchIdentity';
import { ReviewSheets } from './ReviewSheets';
import { Scoreboard } from './Scoreboard';
import { TeamCard } from './TeamCard';
import { TimelineBlock } from './TimelineBlock';

interface Props {
  demo: ParsedDemo;
  cache: CacheState;
  /** Which round the match opens on — §10.2's dialog is what makes it anything but the first. */
  roundIndex: number;
  onClose: () => void;
}

/**
 * The stage — DESIGN.md §5. A plate in the middle and four cards around it, and the grid is what
 * makes §5.1 structural rather than a promise: the middle column is exactly
 * `100cqi - 2 * (card + gap) - 2 * inset` wide and `100cqb - timeline-block - 2 * inset` tall, the
 * plate takes `min(100cqi, 100cqb)` of that cell, and **no card can overlap it because no card is
 * in it**. That is what pays for every `backdrop-filter` on this screen (§2.3).
 *
 * Two widths, both layout facts rather than device sizes. Below `wide` the cards dock to the
 * viewport edges — the stage inset goes, the plate takes what it leaves. Below `split` the side
 * columns go and the two team cards merge into one strip above the timeline block, which is still
 * not over the plate.
 *
 * **The screen assembles as it mounts** — §8's one orchestrated moment, and the only one the product
 * has. Each cell carries its own arrival rather than a parent orchestrating them, because the grid
 * is what knows which edge a card lives against; `core/motion` owns the timings, and the round strip
 * fills itself from the same place. It is a mount transition holding no state at all, so it runs
 * once per demo and nothing short of opening another match can replay it. The clock is paused at the
 * opening frame throughout, which is why a wall-time sequence is legitimate here and nowhere else.
 */
export function MatchReview({ demo, cache, roundIndex: openingRoundIndex, onClose }: Props) {
  const locale = useLocale();
  const transport = useTransport(demo, roundOpeningFrame(demo, openingRoundIndex));
  const fullscreen = useFullscreen();

  // Discrete state, so it lives in React rather than on the clock — AGENTS.md §8. A team row is
  // where it is set: a canvas hit test would put the one interaction on the screen that a keyboard
  // cannot reach, which DESIGN.md §9 rules out.
  const [selectedSlot, setSelectedSlot] = useState<PlayerSlot | null>(null);

  // DESIGN.md §9.3's two live regions. The block's own cell is what the hook watches for focus,
  // because a block that has left the screen still holds every control the keyboard can reach.
  const timelineRef = useRef<HTMLDivElement>(null);
  const corners = useHotCorners(fullscreen.isFullscreen, timelineRef);

  // The feed row the pointer or the keyboard is on, and the one thing on this screen that a *hover*
  // sets — DESIGN.md §5.4. It is discrete state for the same reason the selection is, and the feed
  // is what clears it: a row cannot report the pointer leaving once the row itself has gone.
  const [hoveredKill, setHoveredKill] = useState<KillLine | null>(null);

  // The brow is the default — DESIGN.md §5.2 — so this is the reader asking for the chip back over
  // the plate, which is the only thing in the product allowed to cover it (§5.1). Every other row
  // of §10.5's table is read where it is obeyed rather than here.
  const [scoreboard] = useSetting('scoreboard');
  const [isBuyPhaseSkipped] = useSetting('isBuyPhaseSkipped');

  useBuyPhaseSkip(transport, demo, isBuyPhaseSkipped);

  const { openSheet, showSheet, dismissSheet } = useReviewSheets(transport);

  const toggleSelected = useCallback((slot: PlayerSlot) => {
    setSelectedSlot((current) => (current === slot ? null : slot));
  }, []);

  // Which side a slot holds changes at halftime, so the cards follow the round rather than the
  // end-of-match roster — and off the 10 Hz readout, because a roster is text.
  const frame = useFrameReadout(transport);
  const roundIndex = roundIndexAtFrame(demo, frame);
  const sides = useMemo(() => sidesBySlotAtRound(demo, roundIndex), [demo, roundIndex]);
  const ct = useMemo(() => playersOnSide(demo.header.players, sides, 'CT'), [demo, sides]);
  const t = useMemo(() => playersOnSide(demo.header.players, sides, 'T'), [demo, sides]);
  const money = useMemo(() => createMoneyFormat(locale), [locale]);

  useReviewShortcuts({
    demo,
    transport,
    ct,
    t,
    isSuspended: openSheet !== null,
    onToggleSelected: toggleSelected,
    onClearSelection: () => setSelectedSlot(null),
    onFullscreenToggle: fullscreen.toggle,
    onMatchOverlay: () => showSheet('match'),
    onHelp: () => showSheet('help'),
  });

  const teamCards = (
    <>
      <m.div {...assembly('cardLeft')} className="min-w-0 flex-1 split:[grid-area:3/1/4/2]">
        <TeamCard
          demo={demo}
          side="T"
          players={t}
          frame={frame}
          roundIndex={roundIndex}
          selectedSlot={selectedSlot}
          money={money}
          onSelect={toggleSelected}
        />
      </m.div>

      <m.div {...assembly('cardRight')} className="min-w-0 flex-1 split:[grid-area:3/3/4/4]">
        <TeamCard
          demo={demo}
          side="CT"
          players={ct}
          frame={frame}
          roundIndex={roundIndex}
          selectedSlot={selectedSlot}
          money={money}
          onSelect={toggleSelected}
        />
      </m.div>
    </>
  );

  return (
    <div className="grid h-dvh grid-cols-1 grid-rows-[auto_minmax(0,1fr)_auto_auto] gap-3 overflow-hidden bg-surface-0 p-0 split:grid-cols-[minmax(min-content,17.5rem)_minmax(0,1fr)_minmax(min-content,17.5rem)] wide:p-6">
      {/* The inset is this corner's own below `wide`, where the stage has none and the cards dock to
          the viewport edges: a docked card still holds its content off the edge with its own
          padding, and type with no card behind it would sit on the glass of the window. It has no
          bottom half — the grid's own `gap-3` is already under this row, and a second 12px there
          comes out of the plate's square. */}
      <m.div
        {...assembly('stage')}
        className="flex flex-col items-start justify-self-start px-3 pt-3 wide:p-0 [grid-area:1/1/2/2]"
      >
        <LeaveMatch onClose={onClose} />

        <MatchIdentity demo={demo} cache={cache} />
      </m.div>

      {/* The cluster and, under it, §5.4's feed. Above the split this spans rows 1 and 2 of the
          right-hand column — the one cell on the stage that neither a card nor the plate is in — so
          the feed costs the plate nothing but the column width the team card under it already
          claims. Every row inside is `min-w-0` and truncates for that reason: the column is
          `minmax(min-content, 17.5rem)`, so a long enough name would otherwise widen it and take
          the difference out of the plate's square.

          Below the split there is no such cell. Row 1 is shared with the top-left corner and row 2
          *is* the plate, so a feed there would be §5.1's one rule broken; it is not drawn at those
          widths rather than drawn somewhere it does not belong. */}
      <m.div
        {...assembly('cardTop')}
        className="flex flex-col items-end gap-3 justify-self-end [grid-area:1/1/2/2] split:[grid-area:1/3/3/4]"
      >
        <CornerCluster
          isRaised={corners.isClusterRaised}
          isFullscreen={fullscreen.isFullscreen}
          onFullscreenToggle={fullscreen.toggle}
          onSettingsOpen={() => showSheet('settings')}
          onHelpOpen={() => showSheet('help')}
        />

        <div className="hidden min-w-0 self-stretch split:block">
          <EventFeed
            demo={demo}
            transport={transport}
            frame={frame}
            roundIndex={roundIndex}
            players={demo.header.players}
            onKillHover={setHoveredKill}
          />
        </div>
      </m.div>

      {/* The plate's cell carries no padding at all: `min(100cqi,100cqb)` inside it spends every
          pixel on the map, which is why the cards are beside the cell rather than over it. */}
      <m.div
        {...assembly('stage')}
        className="relative grid min-h-0 min-w-0 [grid-area:2/1/3/2] split:[grid-area:1/2/4/3]"
      >
        <MatchRadar
          demo={demo}
          transport={transport}
          selectedSlot={selectedSlot}
          hoveredKill={hoveredKill}
          isSuspended={openSheet !== null}
        />

        {/* §5.1's one permitted overlap, and since #196 the reader's own choice rather than the
            default (§10.5). It is anchored to the top of the plate's *cell* rather than to the
            canvas inside it: above the split those two edges are the same line — the cell is wider
            than it is tall, so the square plate fills its height — and where they are not, the chip
            floats in the letterbox above the plate and covers nothing at all. Anchoring to the
            canvas instead would mean a second reader of `min(100cqi,100cqb)`. */}
        {scoreboard === 'plate' && (
          <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center">
            <Scoreboard demo={demo} frame={frame} locale={locale} position="plate" />
          </div>
        )}
      </m.div>

      {/* `display: contents` above the split, so one pair of cards is a strip in one layout and two
          grid columns in the other without being written out twice. */}
      <div className="flex gap-3 [grid-area:3/1/4/2] split:contents">{teamCards}</div>

      {/* The cell keeps its height whether or not the block is in it — §5.1's plate is sized from
          this row, so a block that collapsed would resize the plate under the reader mid-match. The
          ref is how §9.3's hide knows to stand aside for a `Tab` that has landed inside. */}
      <m.div
        ref={timelineRef}
        {...assembly('cardBottom')}
        className="[grid-area:4/1/5/2] split:[grid-area:4/1/5/4]"
      >
        <TimelineBlock
          demo={demo}
          transport={transport}
          selectedSlot={selectedSlot}
          frame={frame}
          locale={locale}
          hasScoreboard={scoreboard === 'block'}
          isAway={corners.isTimelineAway}
        />
      </m.div>

      <ReviewSheets
        demo={demo}
        openSheet={openSheet}
        roundIndex={roundIndex}
        onDismiss={dismissSheet}
      />
    </div>
  );
}
