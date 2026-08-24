import {
  type ParsedDemo,
  type PlayerInfo,
  type PlayerSlot,
  playersOnSide,
  roundIndexAtFrame,
  roundOpeningFrame,
  sidesBySlotAtRound,
} from '@disa/demo-core';
import { useLocale } from '@disa/i18n';
import { useCallback, useMemo, useState } from 'react';
import type { KillLine } from '@/core/events';
import type { CacheState } from '@/core/parsing';
import { useBuyPhaseSkip, useFrameReadout, useTransport } from '@/core/playback';
import { useSetting } from '@/core/settings';
import {
  CT_ROW_KEYS,
  type ShortcutAction,
  type ShortcutPress,
  T_ROW_KEYS,
  useShortcuts,
} from '@/core/shortcuts';
import { MatchRadar } from '@/features/radar';
import { MatchOverlay } from '@/features/timeline';
import { useFullscreen } from '@/shared/hooks';
import { createMoneyFormat } from '../helpers/money';
import { CornerCluster } from './CornerCluster';
import { EventFeed } from './EventFeed';
import { HelpSheet } from './HelpSheet';
import { LeaveMatch } from './LeaveMatch';
import { MatchIdentity } from './MatchIdentity';
import { Scoreboard } from './Scoreboard';
import { SettingsSheet } from './SettingsSheet';
import { TeamCard } from './TeamCard';
import { TimelineBlock } from './TimelineBlock';

interface Props {
  demo: ParsedDemo;
  cache: CacheState;
  /** Which round the match opens on — §10.2's dialog is what makes it anything but the first. */
  roundIndex: number;
  onClose: () => void;
}

/** What can cover the stage. §7.3's match overlay is one of these in every way that matters here. */
type Sheet = 'settings' | 'help' | 'match';

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
export function MatchReview({ demo, cache, roundIndex: openingRoundIndex, onClose }: Props) {
  const locale = useLocale();
  const transport = useTransport(demo, roundOpeningFrame(demo, openingRoundIndex));
  const fullscreen = useFullscreen();

  // Discrete state, so it lives in React rather than on the clock — AGENTS.md §8. A team row is
  // where it is set: a canvas hit test would put the one interaction on the screen that a keyboard
  // cannot reach, which DESIGN.md §9 rules out.
  const [selectedSlot, setSelectedSlot] = useState<PlayerSlot | null>(null);

  // The feed row the pointer or the keyboard is on, and the one thing on this screen that a *hover*
  // sets — DESIGN.md §5.4. It is discrete state for the same reason the selection is, and the feed
  // is what clears it: a row cannot report the pointer leaving once the row itself has gone.
  const [hoveredKill, setHoveredKill] = useState<KillLine | null>(null);

  // The brow is the default — DESIGN.md §5.2 — so this is the reader asking for the chip back over
  // the plate, which is the only thing in the product allowed to cover it (§5.1). Every other row
  // of §10.5's table is read where it is obeyed rather than here.
  const [scoreboard] = useSetting('scoreboard');
  const [isBuyPhaseSkipped] = useSetting('isBuyPhaseSkipped');

  // §9.1's two arrow-key rows, and the only settings on this screen that are neither read where they
  // are obeyed nor drawn: a key binding is the stage's, because the stage is what holds the table.
  const [seekStepSeconds] = useSetting('seekStepSeconds');
  const [heldArrowRate] = useSetting('heldArrowRate');

  useBuyPhaseSkip(transport, demo, isBuyPhaseSkipped);

  // Which full-screen surface covers the screen, if any. All three stop playback while they are
  // open, which is what makes covering the plate legitimate rather than an exception to principle 4
  // — §5.1 allows it exactly when the plate is not the thing being read. The same state suspends
  // §9.1's bindings, because `Esc` belongs to the dialog while a dialog is up.
  const [openSheet, setOpenSheet] = useState<Sheet | null>(null);

  const showSheet = useCallback(
    (sheet: Sheet) => {
      transport.pause();
      setOpenSheet(sheet);
    },
    [transport],
  );

  const dismissSheet = useCallback(() => setOpenSheet(null), []);

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

  // DESIGN.md §9.1's arrow row, both halves of it. A tap seeks by the configured step; the
  // keyboard's own repeat is what turns the same key into a hold, and a hold is a *rate* the
  // transport owns rather than a stream of seeks — releasing it puts back the rate and the play
  // state it interrupted.
  const seekBy = useCallback(
    (direction: 1 | -1, press: ShortcutPress) => {
      if (press.isRepeat) {
        transport.holdScrub(direction * heldArrowRate);
        return;
      }

      transport.seek(transport.clock.frame + direction * seekStepSeconds * demo.track.sampleHz);
    },
    [demo, transport, seekStepSeconds, heldArrowRate],
  );

  const releaseAction = useCallback(
    (action: ShortcutAction) => {
      if (action === 'seekBack' || action === 'seekForward') transport.releaseScrub();
    },
    [transport],
  );

  const selectRow = useCallback(
    (players: readonly PlayerInfo[], keys: readonly string[], press: ShortcutPress) => {
      const player = players[keys.indexOf(press.key)];

      if (player !== undefined) toggleSelected(player.slot);
    },
    [toggleSelected],
  );

  // DESIGN.md §9's accessibility floor: the match is operable without a pointer. Which key reaches
  // which action is `core/shortcuts`' table, so the help sheet lists exactly what is bound here.
  // The plate's own two keys are bound where the view they move lives, not here.
  useShortcuts(
    {
      playPause: transport.toggle,
      seekBack: (press) => seekBy(-1, press),
      seekForward: (press) => seekBy(1, press),
      stepBack: () => transport.step(-1),
      stepForward: () => transport.step(1),
      previousRound: () => jumpRounds(-1),
      nextRound: () => jumpRounds(1),
      selectTRow: (press) => selectRow(t, T_ROW_KEYS, press),
      selectCtRow: (press) => selectRow(ct, CT_ROW_KEYS, press),
      clearSelection: () => setSelectedSlot(null),
      fullscreen: fullscreen.toggle,
      matchOverlay: () => showSheet('match'),
      help: () => showSheet('help'),
    },
    { isSuspended: openSheet !== null, onRelease: releaseAction },
  );

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
      {/* The inset is this corner's own below `wide`, where the stage has none and the cards dock to
          the viewport edges: a docked card still holds its content off the edge with its own
          padding, and type with no card behind it would sit on the glass of the window. It has no
          bottom half — the grid's own `gap-3` is already under this row, and a second 12px there
          comes out of the plate's square. */}
      <div className="flex flex-col items-start justify-self-start px-3 pt-3 wide:p-0 [grid-area:1/1/2/2]">
        <LeaveMatch onClose={onClose} />

        <MatchIdentity demo={demo} cache={cache} />
      </div>

      {/* The cluster and, under it, §5.4's feed. Above the split this spans rows 1 and 2 of the
          right-hand column — the one cell on the stage that neither a card nor the plate is in — so
          the feed costs the plate nothing but the column width the team card under it already
          claims. Every row inside is `min-w-0` and truncates for that reason: the column is
          `minmax(min-content, 17.5rem)`, so a long enough name would otherwise widen it and take
          the difference out of the plate's square.

          Below the split there is no such cell. Row 1 is shared with the top-left corner and row 2
          *is* the plate, so a feed there would be §5.1's one rule broken; it is not drawn at those
          widths rather than drawn somewhere it does not belong. */}
      <div className="flex flex-col items-end gap-3 justify-self-end [grid-area:1/1/2/2] split:[grid-area:1/3/3/4]">
        <CornerCluster
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
      </div>

      {/* The plate's cell carries no padding at all: `min(100cqi,100cqb)` inside it spends every
          pixel on the map, which is why the cards are beside the cell rather than over it. */}
      <div className="relative grid min-h-0 min-w-0 [grid-area:2/1/3/2] split:[grid-area:1/2/4/3]">
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
      </div>

      {/* `display: contents` above the split, so one pair of cards is a strip in one layout and two
          grid columns in the other without being written out twice. */}
      <div className="flex gap-3 [grid-area:3/1/4/2] split:contents">{teamCards}</div>

      <div className="[grid-area:4/1/5/2] split:[grid-area:4/1/5/4]">
        <TimelineBlock
          demo={demo}
          transport={transport}
          selectedSlot={selectedSlot}
          frame={frame}
          locale={locale}
          hasScoreboard={scoreboard === 'block'}
        />
      </div>

      {/* Both sheets live in the top layer, so where they sit in this grid decides nothing about where
          they paint — they are last because that is the reading order a reader who never opens one
          gets from the DOM. */}
      <SettingsSheet isOpen={openSheet === 'settings'} onDismiss={dismissSheet} />

      <HelpSheet isOpen={openSheet === 'help'} onDismiss={dismissSheet} />

      <MatchOverlay
        demo={demo}
        isOpen={openSheet === 'match'}
        onDismiss={dismissSheet}
        roundIndex={roundIndex}
      />
    </div>
  );
}
