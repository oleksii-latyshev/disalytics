import { useEffect, useRef, useState } from 'react';
import { paintLayers } from '@/core/renderer';
import { useSetting } from '@/core/settings';
import { readCssToken } from '@/shared/lib';
import { prefersLessMotion } from '../helpers/less-motion';
import {
  drawMascot,
  lookToward,
  MASCOT_HEIGHT_PX,
  MASCOT_WIDTH_PX,
  type MascotSide,
  type Step,
} from '../helpers/mascot';

/** How long one hop takes, in seconds of wall time. */
const HOP_SECONDS = 0.6;

/** A demo over the window is something to look up at, wherever the pointer was. */
const LOOK_UP: { lookX: Step; lookY: Step } = { lookX: 0, lookY: -1 };

interface Props {
  /** A demo is over the window: it looks up and hops. */
  isLifted: boolean;
}

/**
 * The watcher in the middle of the card that takes a demo: a pixel CT or T who turns towards the
 * pointer, and hops when a demo arrives — #380.
 *
 * **Which side is chance, once per showing of the card.** Both are the product's, neither is the
 * default, and a reader who comes back meets the other one half the time. **It is the chrome's own
 * ink and no side colour**: this screen shows no match, so a blue or a yellow here would mean nothing
 * the demo said (§17) — the silhouette, helmet or balaclava, is what tells the sides apart.
 *
 * Four things are load-bearing. **It is drawn in the way in's own grid**, at `PixelBackdrop`'s pitch.
 * **It costs no layout per move**: the box is measured on mount and on a resize, and a move schedules
 * at most one paint per frame. **The hop is the only wall-time animation** and runs only while a file
 * is over the window. And **only a mouse or a pen turns it** — with touch, a keyboard or reduced
 * motion it faces the reader and nothing moves.
 */
export function CardMascot({ isLifted }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lookRef = useRef<{ lookX: Step; lookY: Step }>({ lookX: 0, lookY: 0 });
  const [side] = useState<MascotSide>(() => (Math.random() < 0.5 ? 'ct' : 't'));
  const [motion] = useSetting('motion');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;

    const ink = readCssToken('--color-ink');
    const still = prefersLessMotion(motion);
    let hop = 0;

    const paint = () => {
      const look = isLifted ? LOOK_UP : lookRef.current;
      paintLayers(canvas, [(context) => drawMascot(context, { side, ...look, hop }, ink)], {
        width: MASCOT_WIDTH_PX,
        height: MASCOT_HEIGHT_PX,
      });
    };

    if (still) {
      lookRef.current = { lookX: 0, lookY: 0 };
      paint();
      return;
    }

    paint();

    let frame = 0;
    let box = canvas.getBoundingClientRect();

    const scheduled = () => {
      frame = 0;
      paint();
    };

    const follow = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;

      const next = lookToward(box, event.clientX, event.clientY);
      if (next.lookX === lookRef.current.lookX && next.lookY === lookRef.current.lookY) return;

      lookRef.current = next;
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
  }, [isLifted, motion, side]);

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
