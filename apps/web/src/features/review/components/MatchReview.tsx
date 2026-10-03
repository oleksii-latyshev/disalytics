import { type Frame, type ParsedDemo, type PlayerSlot, roundOpeningFrame } from '@disa/demo-core';
import { useLocale } from '@disa/i18n';
import { motion } from '@disa/ui';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { RowFocus } from '@/core/events';
import { assembly } from '@/core/motion';
import type { StatsTab } from '@/core/navigation';
import type { CacheState } from '@/core/parsing';
import { useBuyPhaseSkip, useIsPlaying, useTransport } from '@/core/playback';
import { useSetting } from '@/core/settings';
import { MatchRadar, useCoachKeys, useCoachSession } from '@/features/radar';
import { useFullscreen } from '@/shared/hooks';
import { type MapNarrowing, WHOLE_MATCH } from '../helpers/map-scope';
import { type MatchView, nextMatchView } from '../helpers/match-views';
import { useHotCorners } from '../hooks/use-hot-corners';
import { useMatchReadout } from '../hooks/use-match-readout';
import { useMatchRouteSync } from '../hooks/use-match-route-sync';
import { useReviewSheets } from '../hooks/use-review-sheets';
import { useReviewShortcuts } from '../hooks/use-review-shortcuts';
import { CornerCluster } from './CornerCluster';
import { EventFeed } from './EventFeed';
import { MatchCorner } from './MatchCorner';
import { MatchViewBar } from './MatchViewBar';
import { MatchViewScreen } from './MatchViewScreen';
import { ReviewSheets } from './ReviewSheets';
import { Scoreboard } from './Scoreboard';
import { TeamCard } from './TeamCard';
import { TimelineBlock } from './TimelineBlock';

interface Props {
  demo: ParsedDemo;
  cache: CacheState;

  roundIndex: number;
  urlRound: number;
  view: MatchView;
  onView: (view: MatchView) => void;
  statsTab: StatsTab;
  onStatsTab: (tab: StatsTab) => void;
  onRoundChange: (round: number) => void;
  onClose: () => void;
}

export function MatchReview({
  demo,
  cache,
  roundIndex: openingRoundIndex,
  urlRound,
  view,
  onView,
  statsTab,
  onStatsTab,
  onRoundChange,
  onClose,
}: Props) {
  const locale = useLocale();
  const transport = useTransport(demo, roundOpeningFrame(demo, openingRoundIndex));
  const fullscreen = useFullscreen();
  const [selectedSlot, setSelectedSlot] = useState<PlayerSlot | null>(null);
  const [isPlateExpanded, setPlateExpanded] = useState(false);
  const [duelNarrowing, setDuelNarrowing] = useState<MapNarrowing>(WHOLE_MATCH);
  const openOnStage = useCallback(
    (frame: Frame) => {
      transport.pause();
      transport.seek(frame);
      onView('stage');
    },
    [onView, transport],
  );
  const timelineRef = useRef<HTMLDivElement>(null);
  const corners = useHotCorners(fullscreen.isFullscreen, timelineRef);
  const [focus, setFocus] = useState<RowFocus | null>(null);
  const [scoreboard] = useSetting('scoreboard');
  const [isBuyPhaseSkipped] = useSetting('isBuyPhaseSkipped');

  useBuyPhaseSkip(transport, demo, isBuyPhaseSkipped);

  const { openSheet, showSheet, dismissSheet } = useReviewSheets(transport);

  const toggleSelected = useCallback((slot: PlayerSlot) => {
    setSelectedSlot((current) => (current === slot ? null : slot));
  }, []);

  const coach = useCoachSession();
  const isPlaying = useIsPlaying(transport);

  const toggleCoachPencil = useCallback(() => {
    if (coach.getState().tool === null) transport.pause();
    coach.toggleTool('pencil');
  }, [coach, transport]);

  const clearSelectionOrTool = useCallback(() => {
    if (coach.getState().tool === null) setSelectedSlot(null);
    else coach.setTool(null);
  }, [coach]);

  useEffect(() => {
    if (isPlaying || view !== 'stage') coach.reset();
  }, [coach, isPlaying, view]);

  const { frame, roundIndex, ct, t, money, shape } = useMatchReadout(demo, transport, locale);

  const drawnRoundRef = useRef(roundIndex);
  useEffect(() => {
    if (drawnRoundRef.current === roundIndex) return;
    drawnRoundRef.current = roundIndex;
    coach.discardDrawings();
  }, [coach, roundIndex]);

  useCoachKeys(coach, openSheet !== null);

  useMatchRouteSync({
    demo,
    transport,
    urlRound,
    transportRound: roundIndex === undefined ? undefined : roundIndex + 1,
    onRoundChange,
  });

  useReviewShortcuts({
    demo,
    transport,
    ct,
    t,
    isSuspended: openSheet !== null,
    onToggleSelected: toggleSelected,
    onClearSelection: clearSelectionOrTool,
    onFullscreenToggle: fullscreen.toggle,
    onMatchOverlay: () => showSheet('match'),
    onNextView: () => onView(nextMatchView(view)),
    onCoachMode: toggleCoachPencil,
    onHelp: () => showSheet('help'),
  });

  const teamCards = (
    <>
      <motion.div
        {...assembly('cardLeft')}
        className="relative z-10 min-w-0 flex-1 split:[grid-area:3/1/4/2]"
      >
        <TeamCard
          demo={demo}
          side="T"
          players={t}
          frame={frame}
          roundIndex={roundIndex}
          selectedSlot={selectedSlot}
          money={money}
          shape={shape}
          onSelect={toggleSelected}
        />
      </motion.div>

      <motion.div
        {...assembly('cardRight')}
        className="relative z-10 min-w-0 flex-1 split:[grid-area:3/3/4/4]"
      >
        <TeamCard
          demo={demo}
          side="CT"
          players={ct}
          frame={frame}
          roundIndex={roundIndex}
          selectedSlot={selectedSlot}
          money={money}
          shape={shape}
          onSelect={toggleSelected}
        />
      </motion.div>
    </>
  );

  if (view !== 'stage') {
    return (
      <MatchViewScreen
        demo={demo}
        cache={cache}
        view={view}
        roundIndex={roundIndex}
        openSheet={openSheet}
        onView={onView}
        statsTab={statsTab}
        onStatsTab={onStatsTab}
        onClose={onClose}
        onDismissSheet={dismissSheet}
        duelNarrowing={duelNarrowing}
        onDuelNarrowing={setDuelNarrowing}
        onOpenOnStage={openOnStage}
      />
    );
  }

  return (
    <div className="relative grid h-dvh grid-cols-1 grid-rows-[auto_minmax(0,1fr)_auto_auto] gap-3 overflow-hidden bg-surface-0 p-0 split:grid-cols-[minmax(min-content,17.5rem)_minmax(0,1fr)_minmax(min-content,17.5rem)] wide:p-6">
      <motion.div
        {...assembly('stage')}
        className="flex flex-col items-start justify-self-start px-3 pt-3 wide:p-0 [grid-area:1/1/2/2]"
      >
        <MatchCorner demo={demo} cache={cache} onClose={onClose} />
      </motion.div>

      <MatchViewBar view={view} onView={onView}>
        {scoreboard === 'plate' && (
          <Scoreboard demo={demo} frame={frame} locale={locale} position="plate" />
        )}
      </MatchViewBar>

      <motion.div
        {...assembly('cardTop')}
        className={`relative z-10 flex flex-col items-end gap-3 justify-self-end [grid-area:1/1/2/2] split:[grid-area:1/3/3/4] ${
          isPlateExpanded ? 'pointer-events-none [&>*]:pointer-events-auto' : ''
        }`}
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
            onRowFocus={setFocus}
          />
        </div>
      </motion.div>

      <motion.div
        {...assembly('stage')}
        className={`relative z-0 grid min-h-0 min-w-0 [grid-area:2/1/3/2] ${
          isPlateExpanded ? 'split:[grid-area:2/1/4/4]' : 'split:[grid-area:1/2/4/3]'
        }`}
      >
        <MatchRadar
          demo={demo}
          transport={transport}
          selectedSlot={selectedSlot}
          focus={focus}
          isSuspended={openSheet !== null}
          coach={coach}
          onExpandedChange={setPlateExpanded}
        />
      </motion.div>

      <div className="flex gap-3 [grid-area:3/1/4/2] split:contents">{teamCards}</div>

      <motion.div
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
          coach={coach}
          hasScoreboard={scoreboard === 'block'}
          isAway={corners.isTimelineAway}
        />
      </motion.div>

      <ReviewSheets
        demo={demo}
        openSheet={openSheet}
        roundIndex={roundIndex}
        onDismiss={dismissSheet}
      />
    </div>
  );
}
