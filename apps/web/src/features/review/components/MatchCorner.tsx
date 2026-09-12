import type { ParsedDemo } from '@disa/demo-core';
import type { CacheState } from '@/core/parsing';
import type { MatchView } from '../helpers/match-views';
import { LeaveMatch } from './LeaveMatch';
import { MatchIdentity } from './MatchIdentity';
import { MatchViewSwitch } from './MatchViewSwitch';

interface Props {
  demo: ParsedDemo;
  cache: CacheState;
  view: MatchView;
  onView: (view: MatchView) => void;
  onClose: () => void;
}

/**
 * The top-left corner of a match: the way out, which view is open, and which match this is.
 *
 * **Every view draws it**, which is what makes those three things properties of the match rather
 * than of the stage. On the stage it is row 1 of the grid, where it has always been; on a view that
 * replaced the stage it is the head of the screen, and there it costs nothing at all because there
 * is no plate underneath to take the height from.
 *
 * **The switch shares the way out's line rather than taking one of its own.** Row 1 of the stage's
 * grid is `auto`, and the plate is `min(100cqi, 100cqb)` of the cell under it, so a third line in
 * this corner comes straight off the map at every height-bound width. The line is the 40px control
 * the way out already is, so the seats ride inside a height the corner was already spending.
 */
export function MatchCorner({ demo, cache, view, onView, onClose }: Props) {
  return (
    <div className="flex flex-col items-start">
      <div className="flex flex-wrap items-center gap-x-2">
        <LeaveMatch onClose={onClose} />

        <MatchViewSwitch view={view} onView={onView} />
      </div>

      <MatchIdentity demo={demo} cache={cache} />
    </div>
  );
}
