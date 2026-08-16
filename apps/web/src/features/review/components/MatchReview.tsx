import {
  type ParsedDemo,
  type PlayerSlot,
  playersOnSide,
  roundIndexAtFrame,
  roundOpeningFrame,
  sidesBySlotAtRound,
} from '@disa/demo-core';
import { useLocale } from '@disa/i18n';
import { useCallback, useMemo, useState } from 'react';
import type { CacheState } from '@/core/parsing';
import { useFrameReadout, useTransport } from '@/core/playback';
import { useShortcuts } from '@/core/shortcuts';
import { MatchRadar } from '@/features/radar';
import { useFullscreen, useStoredFlag } from '@/shared/hooks';
import { createMoneyFormat } from '../helpers/money';
import { CornerCluster } from './CornerCluster';
import { RoundCard } from './RoundCard';
import { TeamCard } from './TeamCard';
import { TimelineBlock } from './TimelineBlock';

/** Namespaced the way `@disa/i18n` namespaces the locale it remembers. */
const AUDIBILITY_KEY = 'disa.radar.audibility';

interface Props {
  demo: ParsedDemo;
  cache: CacheState;
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
 */
export function MatchReview({ demo, cache, onClose }: Props) {
  const locale = useLocale();
  const transport = useTransport(demo);
  const fullscreen = useFullscreen();

  // Discrete state, so it lives in React rather than on the clock — AGENTS.md §8. A team row is
  // where it is set: a canvas hit test would put the one interaction on the screen that a keyboard
  // cannot reach, which DESIGN.md §9 rules out.
  const [selectedSlot, setSelectedSlot] = useState<PlayerSlot | null>(null);

  // Off by default: the rings are the loudest thing the plate draws, and a reader who wants them
  // asks. `AGENTS.md` §2 rule 5 allows an interface preference to outlive the session.
  const [isAudibilityShown, toggleAudibility] = useStoredFlag(AUDIBILITY_KEY, false);

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

  const jumpRounds = useCallback(
    (rounds: number) => {
      const current = roundIndexAtFrame(demo, transport.clock.frame);
      const wanted = current === undefined ? 0 : current + rounds;
      const last = demo.events.rounds.length - 1;

      transport.seek(roundOpeningFrame(demo, Math.max(Math.min(wanted, last), 0)));
    },
    [demo, transport],
  );

  // DESIGN.md §9's accessibility floor: the match is operable without a pointer. The rest of §9.1 —
  // the held-arrow rate, the row-number keys, `F`, `M` and zoom — is its own step.
  useShortcuts({
    ' ': transport.toggle,
    ',': () => transport.step(-1),
    '.': () => transport.step(1),
    '[': () => jumpRounds(-1),
    ']': () => jumpRounds(1),
    Escape: () => setSelectedSlot(null),
  });

  const teamCards = (
    <>
      <div className="min-w-0 flex-1 split:[grid-area:3/1/4/2]">
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
      </div>

      <div className="min-w-0 flex-1 split:[grid-area:3/3/4/4]">
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
      </div>
    </>
  );

  return (
    <div className="grid h-dvh grid-cols-1 grid-rows-[auto_minmax(0,1fr)_auto_auto] gap-3 bg-surface-0 p-0 split:grid-cols-[minmax(min-content,17.5rem)_minmax(0,1fr)_minmax(min-content,17.5rem)] wide:p-6">
      <div className="justify-self-start [grid-area:1/1/2/2]">
        <RoundCard
          demo={demo}
          frame={frame}
          roundIndex={roundIndex}
          locale={locale}
          cache={cache}
        />
      </div>

      <div className="justify-self-end [grid-area:1/1/2/2] split:[grid-area:1/3/2/4]">
        <CornerCluster
          isFullscreen={fullscreen.isFullscreen}
          onFullscreenToggle={fullscreen.toggle}
          isAudibilityShown={isAudibilityShown}
          onAudibilityToggle={toggleAudibility}
          onClose={onClose}
        />
      </div>

      {/* The plate's cell carries no padding at all: `min(100cqi,100cqb)` inside it spends every
          pixel on the map, which is why the cards are beside the cell rather than over it. */}
      <div className="grid min-h-0 min-w-0 [grid-area:2/1/3/2] split:[grid-area:1/2/4/3]">
        <MatchRadar
          demo={demo}
          transport={transport}
          selectedSlot={selectedSlot}
          isAudibilityShown={isAudibilityShown}
        />
      </div>

      {/* `display: contents` above the split, so one pair of cards is a strip in one layout and two
          grid columns in the other without being written out twice. */}
      <div className="flex gap-3 [grid-area:3/1/4/2] split:contents">{teamCards}</div>

      <div className="[grid-area:4/1/5/2] split:[grid-area:4/1/5/4]">
        <TimelineBlock demo={demo} transport={transport} selectedSlot={selectedSlot} />
      </div>
    </div>
  );
}
