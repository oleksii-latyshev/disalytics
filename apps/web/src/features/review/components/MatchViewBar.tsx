import type { ReactNode } from 'react';
import type { MatchView } from '../helpers/match-views';
import { MatchViewSwitch } from './MatchViewSwitch';

interface Props {
  view: MatchView;
  onView: (view: MatchView) => void;
  /** What hangs under the switch — the scoreboard, on a screen that has a clock to state. */
  children?: ReactNode;
}

/**
 * The match's own navigation, at the top centre of whatever the match is showing — #364.
 *
 * **It is out of flow, and that is the whole of why it can be here.** #360 put the seats on the way
 * out's line because a line of their own comes straight off the map: the plate is
 * `min(100cqi, 100cqb)` of the cell the stage's grid leaves it, and three of the four widths this
 * repository quotes a plate figure at are height-bound. An absolutely positioned bar takes no row,
 * so the plate measures exactly what it measured before — and the switch stands in one place on
 * every view instead of riding a corner whose width changes with the locale.
 *
 * **It stands on `.surface-hud`**, which is the surface that already exists for standing over a live
 * plate. Since the redesign that class carries no `backdrop-filter` at all, so a second tenant costs
 * nothing but its own opaque box.
 *
 * **The switch is above and the score below**, the owner's instruction of 13 September 2026, and the
 * order is also the one the reader needs: which view they are on is chrome that never changes, and
 * the score is a reading that changes ten times a second.
 *
 * **Only the two boxes take pointer events.** The bar spans the screen's whole width so its
 * children can be centred, and an expanded plate (#315) runs underneath it — without this, every
 * drag aimed at the map along the top of the screen would land on an empty strip instead.
 */
export function MatchViewBar({ view, onView, children }: Props) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-20 flex flex-col items-center gap-2 wide:top-6">
      <div className="surface-hud pointer-events-auto rounded-card px-1.5 py-1">
        <MatchViewSwitch view={view} onView={onView} />
      </div>

      {children !== undefined && children !== false && (
        <div className="pointer-events-auto">{children}</div>
      )}
    </div>
  );
}
