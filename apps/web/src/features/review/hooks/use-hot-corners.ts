import { type RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { isInTopRightQuadrant, isOverBottomEdge, isStill } from '../helpers/hot-corners';

/**
 * How often stillness is checked. The pointer writes a timestamp and never a timer, so moving costs
 * two comparisons and two assignments — resetting a `setTimeout` per `pointermove` is work on a path
 * that runs at the pointer's own rate all the way through playback.
 */
const STILLNESS_TICK_MS = 500;

export interface HotCorners {
  /** Whether the pointer is in the top-right quadrant, which is what raises §5.4's cluster. */
  readonly isClusterRaised: boolean;
  /** Whether §5.5's block has left the bottom of the screen. Only fullscreen can make it true. */
  readonly isTimelineAway: boolean;
}

/**
 * The stage's live regions — `docs/DESIGN.md` §9.3. Two of the four corners have something to
 * reveal and the other two carry cards that are always visible; this hook knows about the two.
 *
 * **State changes on a boundary crossing and never on a move.** Both regions are compared against
 * what they last were, so a pointer travelling across the stage re-renders the stage twice — on the
 * way in and on the way out — rather than at the pointer's own rate, which on this screen would
 * reconcile ten player rows for every mouse event.
 *
 * The block is hidden by *stillness* and brought back by the *edge*, which is §9.3's rule and not
 * the usual one: a nudge of the mouse in the middle of the stage does not flash the controls back
 * over the match. Focus is the other way in, because a reader who tabs into a block they cannot see
 * has been given a corner instead of a control.
 */
export function useHotCorners(
  isFullscreen: boolean,
  timelineRef: RefObject<HTMLElement | null>,
): HotCorners {
  const [isClusterRaised, setIsClusterRaised] = useState(false);
  const [isTimelineAway, setIsTimelineAway] = useState(false);

  // Mirrors of the two, so the pointer handler can decide whether anything changed without reading
  // React state it would have to be re-created to see.
  const raised = useRef(false);
  const away = useRef(false);
  const overEdge = useRef(false);
  const lastMoveAt = useRef(0);

  const send = useCallback((next: boolean) => {
    if (away.current === next) return;

    away.current = next;
    setIsTimelineAway(next);
  }, []);

  useEffect(() => {
    const watching = new AbortController();

    const track = (event: PointerEvent): void => {
      const inQuadrant = isInTopRightQuadrant(
        event.clientX,
        event.clientY,
        window.innerWidth,
        window.innerHeight,
      );

      if (inQuadrant !== raised.current) {
        raised.current = inQuadrant;
        setIsClusterRaised(inQuadrant);
      }

      overEdge.current = isOverBottomEdge(event.clientY, window.innerHeight);
      lastMoveAt.current = event.timeStamp;

      if (overEdge.current) send(false);
    };

    // A pointer that has left the window is in no region at all, and `pointermove` stops reporting
    // where it went the moment it does.
    const withdraw = (): void => {
      overEdge.current = false;

      if (raised.current) {
        raised.current = false;
        setIsClusterRaised(false);
      }
    };

    // The keyboard's way back in, and it is here rather than an `onFocus` on the cell because the
    // block is a static element the reader tabs *through*: a corner is an accelerator, and a reader
    // who has tabbed into a control they cannot see has been handed the corner instead.
    const follow = (event: FocusEvent): void => {
      const target = event.target;

      if (target instanceof Node && timelineRef.current?.contains(target) === true) send(false);
    };

    window.addEventListener('pointermove', track, { signal: watching.signal });
    document.addEventListener('pointerleave', withdraw, { signal: watching.signal });
    document.addEventListener('focusin', follow, { signal: watching.signal });

    return () => watching.abort();
  }, [send, timelineRef]);

  useEffect(() => {
    // Nothing hides outside fullscreen — §9.3 — and leaving it has to put the block back, because
    // the reader who pressed `F` is no longer anywhere near the edge that would.
    if (!isFullscreen) {
      send(false);
      return;
    }

    lastMoveAt.current = performance.now();

    const consider = (): void => {
      if (overEdge.current) return;
      if (!isStill(performance.now(), lastMoveAt.current)) return;

      const focused = document.activeElement;
      if (focused !== null && timelineRef.current?.contains(focused) === true) return;

      send(true);
    };

    const timer = window.setInterval(consider, STILLNESS_TICK_MS);

    return () => window.clearInterval(timer);
  }, [isFullscreen, send, timelineRef]);

  return { isClusterRaised, isTimelineAway };
}
