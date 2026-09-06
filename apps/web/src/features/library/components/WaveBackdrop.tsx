import { Mesh, Program, Renderer, Triangle } from 'ogl';
import { useEffect, useRef } from 'react';
import { useSetting } from '@/core/settings';
import { WAVE_FRAGMENT, WAVE_VERTEX, waveColours } from '../helpers/waves';

/**
 * A device pixel ratio of 2 quadruples the fragments for a picture with no edge in it. The bands are
 * a gradient — there is nothing here that resolution resolves — so the buffer is capped and the
 * browser scales it up, which is what keeps a full-screen shader affordable on a laptop that is
 * about to spend every core it has on a parse.
 */
const MAX_PIXEL_RATIO = 1.25;

/** Seconds of drift per second of wall time. Slow enough that a still frame and a moving one look alike. */
const DRIFT = 0.5;

interface Props {
  /** The drag acknowledgement, which lifts the ground the way the plate used to be lifted. */
  isLifted: boolean;
}

function prefersLessMotion(setting: string): boolean {
  if (setting === 'reduced') return true;
  if (setting === 'full') return false;

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * The way in's ground: three colour bands drifting behind the whole shell.
 *
 * **This is the one place in the product where a hue means nothing the demo said**, and it is a
 * decision rather than a slip — the way in shows no match, so there is no reading for a colour to be
 * confused with. It has its own two tokens for that reason; borrowing `--color-ct` would have put a
 * side's colour on a screen with no sides on it. The review screen never mounts this.
 *
 * Three things are load-bearing. **The loop stops with the tab**, because a hidden tab's animation
 * frames are a background process spending a battery on a picture nobody is looking at — and a
 * `visibilitychange` is also what re-reads the clock, so a tab that comes back does not jump the
 * bands forward by the minutes it was away. **Reduced motion draws exactly one frame**: the picture
 * is the same picture, and it is `@disa/ui`'s own setting rather than a second reading of the media
 * query, so the three answers in the settings sheet mean here what they mean everywhere. And
 * **nothing in the frame allocates** — the uniforms are the objects created at mount, written in
 * place, which is the same rule the plate's own draw obeys.
 */
export function WaveBackdrop({ isLifted }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [motion] = useSetting('motion');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;

    const renderer = new Renderer({
      canvas,
      alpha: false,
      antialias: false,
      dpr: Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO),
    });
    const colours = waveColours(document.documentElement);
    const program = new Program(renderer.gl, {
      vertex: WAVE_VERTEX,
      fragment: WAVE_FRAGMENT,
      uniforms: {
        uTime: { value: 0 },
        uAspect: { value: 1 },
        uGround: { value: colours.ground },
        uFirst: { value: colours.first },
        uSecond: { value: colours.second },
      },
    });
    const mesh = new Mesh(renderer.gl, { geometry: new Triangle(renderer.gl), program });

    const resize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      program.uniforms.uAspect.value = Math.max(1, window.innerWidth / window.innerHeight);
      renderer.render({ scene: mesh });
    };

    resize();
    window.addEventListener('resize', resize);

    if (prefersLessMotion(motion)) {
      return () => {
        window.removeEventListener('resize', resize);
        renderer.gl.getExtension('WEBGL_lose_context')?.loseContext();
      };
    }

    let frame = 0;
    let last = performance.now();

    const draw = (now: number) => {
      program.uniforms.uTime.value += ((now - last) / 1000) * DRIFT;
      last = now;
      renderer.render({ scene: mesh });
      frame = requestAnimationFrame(draw);
    };

    const follow = () => {
      cancelAnimationFrame(frame);
      if (document.hidden) return;

      last = performance.now();
      frame = requestAnimationFrame(draw);
    };

    follow();
    document.addEventListener('visibilitychange', follow);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', follow);
      renderer.gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [motion]);

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 transition-opacity duration-(--duration-panel) ease-out ${
        isLifted ? 'opacity-100' : 'opacity-75'
      }`}
    >
      <canvas ref={canvasRef} className="size-full" />
    </div>
  );
}
