import type { Frame, ParsedDemo } from '@disa/demo-core';
import type { CacheState } from '@/core/parsing';
import type { MapNarrowing } from '../helpers/map-scope';
import type { MatchView } from '../helpers/match-views';
import type { Sheet } from '../hooks/use-review-sheets';
import { MatchCorner } from './MatchCorner';
import { MatchDuels } from './MatchDuels';
import { MatchHeatmap } from './MatchHeatmap';
import { MatchMetrics } from './MatchMetrics';
import { MatchScoreboard } from './MatchScoreboard';
import { MatchUtility } from './MatchUtility';
import { MatchViewBar } from './MatchViewBar';
import { ReviewSheets } from './ReviewSheets';

interface Props {
  demo: ParsedDemo;
  cache: CacheState;
  view: Exclude<MatchView, 'stage'>;
  roundIndex: number | undefined;
  openSheet: Sheet | null;
  onView: (view: MatchView) => void;
  onClose: () => void;
  onDismissSheet: () => void;
  duelNarrowing: MapNarrowing;
  onDuelNarrowing: (narrowing: MapNarrowing) => void;
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
  cache,
  view,
  roundIndex,
  openSheet,
  onView,
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
      <MatchViewBar view={view} onView={onView} />

      {view === 'scoreboard' && <MatchScoreboard demo={demo} />}
      {view === 'duels' && (
        <MatchDuels
          demo={demo}
          narrowing={duelNarrowing}
          onNarrowing={onDuelNarrowing}
          onOpenOnStage={onOpenOnStage}
        />
      )}
      {view === 'heatmap' && <MatchHeatmap demo={demo} />}
      {view === 'utility' && <MatchUtility demo={demo} />}
      {view === 'metrics' && <MatchMetrics demo={demo} />}

      <ReviewSheets
        demo={demo}
        openSheet={openSheet}
        roundIndex={roundIndex}
        onDismiss={onDismissSheet}
      />
    </div>
  );
}
