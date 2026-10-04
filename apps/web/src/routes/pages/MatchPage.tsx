import { useMatch, useNavigate } from '@tanstack/react-router';
import { useCallback, useEffect, useRef } from 'react';
import { afterRouteNavigation, clampMatchRound, type StatsTab } from '@/core/navigation';
import { nonReadyParseState } from '@/core/parsing';
import { sampleKey } from '@/core/samples';
import { HomeView, useReadingPosition, WayIn } from '@/features/library';
import { MatchReview } from '@/features/review';
import { useAppRouteContext } from '../context';

export function MatchPage() {
  const { parse, onUpdate, parseOrigin } = useAppRouteContext();
  const navigate = useNavigate({ from: '/match/$demoKey' });
  const match = useMatch({ from: '/match/$demoKey', select: (route) => route });
  const demoKey = match.params.demoKey;
  const search = match.search;
  const onRoundChange = useCallback(
    (nextRound: number) => {
      if (search.round === nextRound) return;
      void navigate({
        search: (previous: typeof search) => ({ ...previous, round: nextRound }),
        replace: true,
      });
    },
    [navigate, search.round],
  );
  const onView = useCallback(
    (view: typeof search.view) => {
      if (search.view === view) return;
      void navigate({
        search: (previous: typeof search) => ({ round: previous.round, view }),
      });
    },
    [navigate, search.view],
  );
  const onStatsTab = useCallback(
    (tab: StatsTab) => {
      if (search.tab === tab) return;
      void navigate({ search: (previous: typeof search) => ({ ...previous, tab }) });
    },
    [navigate, search.tab],
  );
  const closeRestore = () => {
    parse.close();
    void navigate({ to: '/library' });
  };
  const state = parse.state;
  const { restoreKey } = parse;
  const isOpen = state.status === 'ready' && state.demoKey === demoKey;
  useReadingPosition(
    isOpen ? demoKey : null,
    clampMatchRound(search.round, isOpen ? state.demo.events.rounds.length : 1),
  );
  const restoreRequest = useRef({
    demoKey,
    round: search.round,
    shouldRestore: !(state.status === 'ready' && state.demoKey === demoKey),
  });
  if (restoreRequest.current.demoKey !== demoKey) {
    restoreRequest.current = {
      demoKey,
      round: search.round,
      shouldRestore: !(state.status === 'ready' && state.demoKey === demoKey),
    };
  }

  useEffect(() => {
    if (!restoreRequest.current.shouldRestore) return;
    return restoreKey(demoKey, restoreRequest.current.round);
  }, [demoKey, restoreKey]);

  if (state.status !== 'ready' || state.demoKey !== demoKey) {
    const displayState = nonReadyParseState(state);
    return (
      <WayIn
        state={displayState}
        isDraggedOver={false}
        onClose={closeRestore}
        onUpdate={onUpdate}
        view="home"
      >
        <HomeView
          state={displayState}
          onFile={(file) => {
            void afterRouteNavigation(
              () => navigate({ to: '/' }),
              () => {
                parseOrigin.current = '/';
                parse.open(file);
              },
            );
          }}
          onClose={closeRestore}
          isDraggedOver={false}
          onEnter={(saved, roundIndex) => {
            parse.openSaved(saved, roundIndex);
            void navigate({
              to: '/match/$demoKey',
              params: { demoKey: saved.key },
              search: { round: roundIndex + 1, view: 'stage' },
            });
          }}
          onSample={(sample) => {
            parse.openSample(sample);
            void navigate({
              to: '/match/$demoKey',
              params: { demoKey: sampleKey(sample.id) },
              search: { round: 1, view: 'stage' },
            });
          }}
        />
      </WayIn>
    );
  }

  const round = clampMatchRound(search.round, state.demo.events.rounds.length);
  return (
    <MatchReview
      key={demoKey}
      demo={state.demo}
      demoKey={demoKey}
      cache={state.cache}
      roundIndex={round - 1}
      urlRound={round}
      view={search.view}
      onView={onView}
      statsTab={search.tab ?? 'players'}
      onStatsTab={onStatsTab}
      onRoundChange={onRoundChange}
      onClose={() => {
        parse.close();
        void navigate({ to: '/library' });
      }}
    />
  );
}
