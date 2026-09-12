import type { ParsedDemo } from '@disa/demo-core';
import type { CacheState } from '@/core/parsing';
import { LeaveMatch } from './LeaveMatch';
import { MatchIdentity } from './MatchIdentity';

interface Props {
  demo: ParsedDemo;
  cache: CacheState;
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
 * **The switch is not here any more** — #364 stands it at the top centre of the screen, where it is
 * in the same place on every view instead of riding the corner's first line. What the corner keeps
 * is what it was before #360: the way out and which match this is, two lines of type on the app's
 * own ground, none of it a function of the frame.
 */
export function MatchCorner({ demo, cache, onClose }: Props) {
  return (
    <div className="flex flex-col items-start">
      <LeaveMatch onClose={onClose} />

      <MatchIdentity demo={demo} cache={cache} />
    </div>
  );
}
