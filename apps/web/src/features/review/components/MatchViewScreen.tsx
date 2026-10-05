import type { Frame, ParsedDemo } from '@disa/demo-core';
import { Text } from '@disa/i18n';
import { lazy, Suspense } from 'react';
import type { StatsTab } from '@/core/navigation';
import type { CacheState } from '@/core/parsing';
import type { DuelNarrowing } from '../helpers/map-scope';
import type { MatchView } from '../helpers/match-views';
import type { Sheet } from '../hooks/use-review-sheets';
import { MatchCorner } from './MatchCorner';
import { MatchViewBar } from './MatchViewBar';
import { ReviewSheets } from './ReviewSheets';

// One chunk per view: the stage never opens a view, and the lineup form behind the utility view
// alone weighs more than the rest of the review screen's own code. `bun run size` reads these keys.
const MatchStats = lazy(async () => ({ default: (await import('./MatchStats')).MatchStats }));
const MatchDuels = lazy(async () => ({ default: (await import('./MatchDuels')).MatchDuels }));
const MatchHeatmap = lazy(async () => ({ default: (await import('./MatchHeatmap')).MatchHeatmap }));
const MatchUtility = lazy(async () => ({ default: (await import('./MatchUtility')).MatchUtility }));

interface Props {
  demo: ParsedDemo;
  demoKey: string;
  cache: CacheState;
  view: Exclude<MatchView, 'stage'>;
  roundIndex: number | undefined;
  openSheet: Sheet | null;
  onView: (view: MatchView) => void;
  statsTab: StatsTab;
  onStatsTab: (tab: StatsTab) => void;
  onClose: () => void;
  onDismissSheet: () => void;
  duelNarrowing: DuelNarrowing;
  onDuelNarrowing: (narrowing: DuelNarrowing) => void;
  /** Leave for the stage at a frame — a duel opened from the duel map (#387). */
  onOpenOnStage: (frame: Frame) => void;
}

/**
 * A view of the match that is not the stage. It takes the whole screen, which is the decision
 * `ROADMAP.md` M5's first row asked for: a view is a place rather than a sheet over a paused match.
 *
 * **The stage's grid is not involved at all**, and that is what keeps §5.1's plate figures exactly
 * where they were — the plate is sized by a grid this screen never enters. The corner comes along
 * because the way out, the map's name and which view is open belong to the match.
 */
export function MatchViewScreen({
  demo,
  demoKey,
  cache,
  view,
  roundIndex,
  openSheet,
  onView,
  statsTab,
  onStatsTab,
  onClose,
  onDismissSheet,
  duelNarrowing,
  onDuelNarrowing,
  onOpenOnStage,
}: Props) {
  return (
    <div className="relative grid h-dvh grid-rows-[auto_minmax(0,1fr)] gap-3 overflow-hidden bg-surface-0 p-3 wide:p-6">
      <MatchCorner demo={demo} cache={cache} onClose={onClose} />

      {/* The same bar in the same place as on the stage — #364. A view screen has no clock of its
          own to state, so nothing hangs under it here. */}
      <MatchViewBar view={view} onView={onView} analysisView={view} />

      <Suspense fallback={<ViewPending />}>
        {view === 'stats' && (
          <MatchStats
            demo={demo}
            tab={statsTab}
            onTab={onStatsTab}
            initialRound={roundIndex ?? 0}
            onOpenOnStage={onOpenOnStage}
            onPlayerView={(target, slot) => {
              if (target === 'duels') {
                onDuelNarrowing({ ...duelNarrowing, player: slot, pair: null, duel: null });
              }
              onView(target);
            }}
          />
        )}
        {view === 'duels' && (
          <MatchDuels
            demo={demo}
            narrowing={duelNarrowing}
            onNarrowing={onDuelNarrowing}
            onOpenOnStage={onOpenOnStage}
          />
        )}
        {view === 'heatmap' && <MatchHeatmap demo={demo} demoKey={demoKey} />}
        {view === 'utility' && <MatchUtility demo={demo} onOpenOnStage={onOpenOnStage} />}
      </Suspense>

      <ReviewSheets
        demo={demo}
        openSheet={openSheet}
        roundIndex={roundIndex}
        onDismiss={onDismissSheet}
      />
    </div>
  );
}

/** The view's own ground while its chunk arrives, so the bar stays put and nothing jumps. */
function ViewPending() {
  return (
    <div
      role="status"
      className="surface-card grid min-h-0 place-items-center rounded-float text-13 text-ink-dim"
    >
      <Text path="review.views.loading" />
    </div>
  );
}
