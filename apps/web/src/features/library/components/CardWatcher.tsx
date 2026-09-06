import { useEffect, useMemo, useRef } from 'react';
import { useCanvasLayers } from '@/core/renderer';
import { useSetting } from '@/core/settings';
import { visionWedge } from '@/features/radar';
import { prefersLessMotion } from '../helpers/less-motion';
import { angleToPointer, drawWatcher, RESTING_ANGLE, watcherColours } from '../helpers/watcher';

interface Props {
  /** The drag acknowledgement, which is the one thing this mark has to say. */
  isLifted: boolean;
}

/**
 * A player standing on the card that takes a demo, watching the pointer.
 *
 * Five things are load-bearing. **The canvas is placed and sized**, `inset-0` *and* `size-full`: a
 * canvas carries an intrinsic ratio from its backing store, so out of flow it keeps its own width
 * rather than stretching to four edges — #315 paid for that one on the plate. **It paints under the
 * card's content by DOM order and the content says so**: a positioned element paints over every
 * static sibling however late that sibling comes, so the body and the note carry `relative`
 * themselves rather than relying on where they sit. **It costs no layout per move** — the box is
 * measured on mount and on a resize rather than inside the pointer handler, and a move schedules at
 * most one repaint per frame, so crossing the screen at 120 Hz is 120 draws of one cone and not 120
 * `getBoundingClientRect` calls. **With no pointer it does not move at all**: the resting angle is
 * what a touch reader and a keyboard reader see, and nothing here is reachable only by making it
 * turn. And **reduced motion is the same three answers the rest of the way in obeys**, read through
 * `prefersLessMotion` rather than a second look at the media query.
 */
export function CardWatcher({ isLifted }: Props) {
  const angleRef = useRef(RESTING_ANGLE);
  const [motion] = useSetting('motion');

  // The wedge caches its gradient across frames and the colours are sixteen `getComputedStyle`
  // reads, so both are made once rather than per draw — and the layer array is the effect
  // dependency `useCanvasLayers` holds steady.
  const wedge = useMemo(visionWedge, []);
  const colours = useMemo(watcherColours, []);
  const layers = useMemo(
    () => [
      (context: CanvasRenderingContext2D, size: { width: number; height: number }) =>
        drawWatcher(context, size, angleRef.current, isLifted, colours, wedge),
    ],
    [isLifted, colours, wedge],
  );

  const { canvasRef, repaint } = useCanvasLayers(layers);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null || prefersLessMotion(motion)) return;

    let frame = 0;
    let box = canvas.getBoundingClientRect();

    const paint = () => {
      frame = 0;
      repaint();
    };

    const remeasure = () => {
      box = canvas.getBoundingClientRect();
    };

    const follow = (event: PointerEvent) => {
      angleRef.current = angleToPointer(box, event.clientX, event.clientY);
      // A rAF id is never 0, so 0 is "nothing scheduled" and a burst of moves inside one frame
      // draws once.
      if (frame === 0) frame = requestAnimationFrame(paint);
    };

    window.addEventListener('pointermove', follow);
    window.addEventListener('resize', remeasure);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', follow);
      window.removeEventListener('resize', remeasure);
    };
  }, [canvasRef, repaint, motion]);

  return (
    // The wrapper carries the hiding rather than the canvas: a canvas is focusable content, and ARIA
    // on one of those is how a keyboard reaches something no reader is ever told about (#220).
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-float"
    >
      <canvas ref={canvasRef} className="absolute inset-0 size-full" />
    </span>
  );
}
