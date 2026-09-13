export type ArrowDirection = 1 | -1;

interface ArrowTarget {
  seek: (direction: ArrowDirection) => void;
  hold: (direction: ArrowDirection) => void;
  release: () => void;
}

/**
 * The arrow row's tap-or-hold decision — #383.
 *
 * A press cannot know on its way down which it is, so it decides nothing: **the keyboard's own
 * repeat makes it a hold**, and a release that no repeat preceded makes it a tap. Seeking on the
 * first `keydown` instead is what started every hold with a 5–15 s jump.
 */
export function createArrowPress(target: ArrowTarget) {
  const pendingTap: Record<ArrowDirection, boolean> = { 1: false, '-1': false };

  return {
    press(direction: ArrowDirection, isRepeat: boolean): void {
      if (!isRepeat) {
        pendingTap[direction] = true;
        return;
      }

      pendingTap[direction] = false;
      target.hold(direction);
    },

    release(direction: ArrowDirection): void {
      if (pendingTap[direction]) target.seek(direction);

      pendingTap[direction] = false;
      target.release();
    },
  };
}
