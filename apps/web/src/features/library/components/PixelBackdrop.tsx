import { DEFAULT_RADAR_THEME, getMapOverview, radarAssetPath } from '@disa/map-data';
import { Mesh, Program, Renderer, Texture, Triangle } from 'ogl';
import { useEffect, useRef } from 'react';
import { useSetting } from '@/core/settings';
import { prefersLessMotion } from '../helpers/less-motion';
import { CELL_PX, coverOf, PIXEL_FRAGMENT, PIXEL_VERTEX, pixelColours } from '../helpers/pixels';

/**
 * The material of the product rather than an illustration. One plate, fixed, because this screen has
 * no demo yet and so no map of its own to show; Dust2 is the one every reader can name from its
 * shape alone, which is what a grid this coarse leaves of it.
 */
const BACKDROP_MAP = 'de_dust2';

/**
 * A device pixel ratio of 2 quadruples the fragments, and the picture is a grid of squares whose
 * size is fixed in CSS pixels — there is nothing here for resolution to resolve. The buffer is
 * capped, which is what keeps a full-screen shader affordable on a laptop about to spend every core
 * it has on a parse.
 */
const MAX_PIXEL_RATIO = 1.25;

/** Radians of wave per second of wall time. Slow enough to be movement rather than animation. */
const DRIFT = 0.5;

/**
 * What the hero stands on. The grid is bright enough that a single lit cell behind a glyph took the
 * worst *pixel* of §14's contrast to **2.73**, against a floor of 4.5 — the mean was 14, which is
 * exactly why a mean is not the measurement. This takes the ground back under the reading and leaves
 * the field around it alone; it is a gradient rather than a card because a rectangle here would be
 * a second surface on a screen whose whole idea is that there is one.
 */
const READING_SCRIM =
  'radial-gradient(62% 52% at 50% 34%, color-mix(in srgb, var(--color-surface-0) 94%, transparent) 0%, transparent 72%)';

interface Props {
  /** The drag acknowledgement, which lifts the ground the way the plate used to be lifted. */
  isLifted: boolean;
}

/**
 * The way in's ground: the radar plate for Dust2, taken apart into a grid of squares that breathe.
 *
 * **This is the one place in the product where a hue means nothing the demo said**, and it is a
 * decision rather than a slip — the way in shows no match, so there is no reading for a colour to be
 * confused with. It has its own two tokens for that reason; borrowing `--color-ct` would have put a
 * side's colour on a screen with no sides on it. The review screen never mounts this.
 *
 * Four things are load-bearing. **The map is a texture rather than an `<img>` behind glass**: the
 * grid samples it once per cell, so what is on screen is the map at the grid's own resolution rather
 * than the map with a mesh drawn over it. **The loop stops with the tab**, and `visibilitychange` is
 * also what re-reads the clock, so a tab that comes back does not jump the wave forward by the
 * minutes it was away. **Reduced motion draws exactly one frame** — the same picture, standing
 * still — and it is `@disa/ui`'s own setting rather than a second reading of the media query, so the
 * three answers in the settings sheet mean here what they mean everywhere. And **nothing in the
 * frame allocates**: the uniforms are the objects created at mount, written in place, which is the
 * rule the plate's own draw obeys.
 */
export function PixelBackdrop({ isLifted }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [motion] = useSetting('motion');

  useEffect(() => {
    const host = hostRef.current;
    const level = getMapOverview(BACKDROP_MAP)?.levels[0];
    if (host === null || level === undefined) return;

    // **The canvas is the renderer's own and lives as long as this effect does.** Handing `ogl` a
    // canvas from the tree looks tidier and cannot work: a canvas hands back the context it already
    // has, and this effect *releases* its context on the way out — so the second mount `StrictMode`
    // makes gets the lost one back, every shader fails to compile with a null info log, and the
    // throw out of the first `render()` takes the whole application off the screen rather than the
    // background. A fresh element per mount is what makes the release and the remount both correct.
    const renderer = new Renderer({
      alpha: false,
      antialias: false,
      dpr: Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO),
    });
    const canvas = renderer.gl.canvas;

    // `setSize` writes the box in CSS pixels; this is the one thing it leaves, and without it the
    // canvas sits on a text baseline and the field is a few pixels short of the viewport.
    canvas.style.display = 'block';
    host.append(canvas);

    const colours = pixelColours(document.documentElement);
    const texture = new Texture(renderer.gl, { generateMipmaps: false });
    const program = new Program(renderer.gl, {
      vertex: PIXEL_VERTEX,
      fragment: PIXEL_FRAGMENT,
      uniforms: {
        uMap: { value: texture },
        uTime: { value: 0 },
        uCell: { value: CELL_PX * renderer.dpr },
        uResolution: { value: [1, 1] },
        uCover: { value: [1, 1] },
        uGround: { value: colours.ground },
        uFirst: { value: colours.first },
        uSecond: { value: colours.second },
      },
    });
    const mesh = new Mesh(renderer.gl, { geometry: new Triangle(renderer.gl), program });

    const render = () => renderer.render({ scene: mesh });

    const resize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      program.uniforms.uResolution.value = [
        window.innerWidth * renderer.dpr,
        window.innerHeight * renderer.dpr,
      ];
      program.uniforms.uCover.value = coverOf(window.innerWidth, window.innerHeight);
      render();
    };

    // The plate arrives after the first frame, so the ground is drawn before it and again with it.
    const image = new Image();
    image.decoding = 'async';
    image.addEventListener('load', () => {
      texture.image = image;
      render();
    });
    image.src = `${import.meta.env.BASE_URL}${radarAssetPath(level, DEFAULT_RADAR_THEME)}`;

    resize();
    window.addEventListener('resize', resize);

    const release = () => {
      canvas.remove();
      renderer.gl.getExtension('WEBGL_lose_context')?.loseContext();
    };

    if (prefersLessMotion(motion)) {
      return () => {
        window.removeEventListener('resize', resize);
        release();
      };
    }

    let frame = 0;
    let last = performance.now();

    const draw = (now: number) => {
      program.uniforms.uTime.value += ((now - last) / 1000) * DRIFT;
      last = now;
      render();
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
      release();
    };
  }, [motion]);

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 transition-opacity duration-(--duration-panel) ease-out ${
        isLifted ? 'opacity-100' : 'opacity-90'
      }`}
    >
      <div ref={hostRef} className="size-full" />
      <div className="absolute inset-0" style={{ background: READING_SCRIM }} />
    </div>
  );
}
