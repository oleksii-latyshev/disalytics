import type { MapOverview } from '@disa/map-data';

const VISION_ALPHA = 0.15;
/** How far the cone reaches in world units before it has faded out entirely — DESIGN.md §6.1. */
const VISION_FADE_UNITS = 1000;
/** The game's default field of view, so the wedge stands for what the player can actually see. */
const VISION_HALF_ANGLE = Math.PI / 4;

/**
 * The cone's reach in device pixels. Derived here rather than by the caller so that every number
 * the wedge is made of lives beside it, and the layer passes only what the frame knows.
 */
export function visionRadius(overview: MapOverview, scale: number): number {
  return (VISION_FADE_UNITS / overview.scale) * scale;
}

export type VisionWedge = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  radius: number,
  color: string,
) => void;

/**
 * The cone the selected player can see, drawn before every token so it tints the plate rather than
 * the players standing in it. One cone at a time is information; ten is a fog, which is what the
 * needles are for — DESIGN.md §6.1.
 *
 * A factory rather than a bare function because the gradient is cached across frames: it is built
 * around the origin and painted under a translation, so only its radius — which follows the canvas
 * — and its colour can invalidate it. Building one inside the draw instead is the allocation
 * AGENTS.md §9 forbids, and the cache belongs with the geometry rather than with the caller.
 */
export function visionWedge(): VisionWedge {
  let gradient: CanvasGradient | null = null;
  let gradientRadius = 0;
  let gradientColor = '';

  function fill(context: CanvasRenderingContext2D, radius: number, color: string): CanvasGradient {
    if (gradient === null || gradientRadius !== radius || gradientColor !== color) {
      const next = context.createRadialGradient(0, 0, 0, 0, 0, radius);
      next.addColorStop(0, color);
      next.addColorStop(1, 'transparent');

      gradient = next;
      gradientRadius = radius;
      gradientColor = color;
    }

    return gradient;
  }

  return (context, x, y, angle, radius, color) => {
    if (radius <= 0) return;

    context.save();
    context.translate(x, y);
    context.globalAlpha = VISION_ALPHA;
    context.fillStyle = fill(context, radius, color);

    context.beginPath();
    context.moveTo(0, 0);
    context.arc(0, 0, radius, angle - VISION_HALF_ANGLE, angle + VISION_HALF_ANGLE);
    context.closePath();
    context.fill();

    context.restore();
  };
}
