import type { ParsedDemo } from '@disa/demo-core';
import type { CacheState } from '@/core/parsing';
import type { MatchView, UnbuiltMatchView } from '../helpers/match-views';
import type { Sheet } from '../hooks/use-review-sheets';
import { MatchCorner } from './MatchCorner';
import { MatchSoon } from './MatchSoon';
import { ReviewSheets } from './ReviewSheets';

interface Props {
  demo: ParsedDemo;
  cache: CacheState;
  view: UnbuiltMatchView;
  roundIndex: number | undefined;
  openSheet: Sheet | null;
  onView: (view: MatchView) => void;
  onClose: () => void;
  onDismissSheet: () => void;
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
}: Props) {
  return (
    <div className="grid h-dvh grid-rows-[auto_minmax(0,1fr)] gap-3 overflow-hidden bg-surface-0 p-3 wide:p-6">
      <MatchCorner demo={demo} cache={cache} view={view} onView={onView} onClose={onClose} />

      <MatchSoon view={view} />

      <ReviewSheets
        demo={demo}
        openSheet={openSheet}
        roundIndex={roundIndex}
        onDismiss={onDismissSheet}
      />
    </div>
  );
}
