import { useEffect, useRef } from 'react';
import { paintLayers } from '@/core/renderer';
import { useSetting } from '@/core/settings';
import { readCssToken } from '@/shared/lib';
import { prefersLessMotion } from '../helpers/less-motion';
import {
  angleToPointer,
  drawMascot,
  MASCOT_HEIGHT_PX,
  MASCOT_WIDTH_PX,
  type MascotColours,
} from '../helpers/mascot';

/** How long one hop takes, in seconds of wall time. */
const HOP_SECONDS = 0.6;

interface Props {
  /** A demo is over the window: it closes its eyes and hops. */
  isLifted: boolean;
}

/**
 * Two colours and no third. The body is the chrome's own ink — this screen shows no match, so there
 * is no reading for a hue to carry — and the eyes are holes rather than marks, so their colour is
 * what is behind the mascot.
 *
 * It does **not** dim at rest and brighten on a drag, which was the first version of this: at
 * `--color-ink-dim` the whole character reads as switched off, and what says a demo has arrived is
 * the face and the hop rather than the ink.
 */
function mascotColours(): MascotColours {
  return { body: readCssToken('--color-ink'), socket: readCssToken('--color-surface-1') };
}

/**
 * The mascot in the middle of the card that takes a demo: it watches the pointer, and it is pleased
 * when a demo arrives.
 *
 * Four things are load-bearing. **It is drawn in the way in's own grid**, at the pitch and the
 * square proportions `PixelBackdrop` uses, so it is made of what the ground is made of — a smooth
 * character here would be a second visual language on a screen of squares. **It costs no layout per
 * move**: the box is measured on mount and on a resize rather than inside the pointer handler, and a
 * move schedules at most one paint per frame. **The hop is the only wall-time animation**, it runs
 * only while a file is over the window, and it stops the moment the drag ends. And **with no pointer
 * nothing moves at all** — this decorates a control that works without it, so a touch reader and a
 * keyboard reader lose nothing.
 */
export function CardMascot({ isLifted }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const angleRef = useRef(0);
  const [motion] = useSetting('motion');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;

    const colours = mascotColours();
    const still = prefersLessMotion(motion);
    let hop = 0;

    const paint = () => {
      paintLayers(
        canvas,
        [(context) => drawMascot(context, { angle: angleRef.current, isLifted, hop }, colours)],
        { width: MASCOT_WIDTH_PX, height: MASCOT_HEIGHT_PX },
      );
    };

    paint();
    if (still) return;

    let frame = 0;
    let box = canvas.getBoundingClientRect();

    const scheduled = () => {
      frame = 0;
      paint();
    };

    const follow = (event: PointerEvent) => {
      angleRef.current = angleToPointer(box, event.clientX, event.clientY);
      // A rAF id is never 0, so 0 is "nothing scheduled" and a burst of moves inside one frame
      // paints once.
      if (frame === 0) frame = requestAnimationFrame(scheduled);
    };

    const remeasure = () => {
      box = canvas.getBoundingClientRect();
    };

    window.addEventListener('pointermove', follow);
    window.addEventListener('resize', remeasure);

    // The hop is its own loop and exists only while there is something to be pleased about.
    let hopFrame = 0;
    if (isLifted) {
      const started = performance.now();
      const bounce = (now: number) => {
        hop = Math.abs(Math.sin(((now - started) / 1000 / HOP_SECONDS) * Math.PI));
        paint();
        hopFrame = requestAnimationFrame(bounce);
      };
      hopFrame = requestAnimationFrame(bounce);
    }

    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(hopFrame);
      window.removeEventListener('pointermove', follow);
      window.removeEventListener('resize', remeasure);
    };
  }, [isLifted, motion]);

  return (
    // The wrapper carries the hiding rather than the canvas: a canvas is focusable content, and ARIA
    // on one of those is how a keyboard reaches something no reader is ever told about (#220).
    <span aria-hidden="true" className="pointer-events-none block">
      <canvas
        ref={canvasRef}
        style={{ width: `${MASCOT_WIDTH_PX}px`, height: `${MASCOT_HEIGHT_PX}px` }}
        className="block"
      />
    </span>
  );
}
