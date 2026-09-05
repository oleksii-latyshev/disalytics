import type { MapOverview } from '@disa/map-data';

/**
 * How far the ray reaches in world units before it has faded out entirely.
 *
 * It is a length rather than a destination, and that is the honest shape: the recording carries no
 * impact point at all — `docs/PARSER.md` §22 counts 54 event names in a match and `bullet_impact`
 * is not one of them — so nothing here knows where the bullet stopped. A ray that visibly runs out
 * says *fired along this line* without claiming to have arrived anywhere.
 */
const TRACER_UNITS = 512;

/** Thin like §6.2's trajectory: it crosses the plate, and a mark that crosses it may not shout. */
const TRACER_WIDTH_PX = 1;

/**
 * How far past the needle's tip the ray begins, so the direction the player faces and the shot
 * they took read as two marks rather than as one long line.
 */
const TRACER_GAP_PX = 3;

/**
 * Where the ray actually starts, given how far the needle in front of it reaches. Exported because
 * the legend has to fit one inside a 56px swatch, and a swatch that guesses this is a swatch that
 * draws the mark running off its own edge.
 */
export function tracerStart(from: number): number {
  return from + TRACER_GAP_PX;
}

/**
 * The ray's reach in device pixels. Derived here rather than by the caller so that every number the
 * tracer is made of lives beside it — the same division of labour as `visionRadius`.
 */
export function tracerLength(overview: MapOverview, scale: number): number {
  return (TRACER_UNITS / overview.scale) * scale;
}

export type TracerStroke = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  from: number,
  length: number,
  color: string,
  alpha: number,
) => void;

/**
 * The line a bullet left along, drawn under every token so a ray crossing the plate never covers a
 * player standing in it.
 *
 * A factory rather than a bare function for the reason `visionWedge` is one: the gradient that
 * fades the ray out is built along the x-axis at the origin and painted under a translation and a
 * rotation, so only its length — which follows the zoom — and its colour can invalidate it.
 * Building one inside the draw is the allocation `AGENTS.md` §9 keeps out of a draw, and this runs
 * up to eight times a frame (`docs/PARSER.md` §22 counts the concurrency).
 */
export function tracerStroke(): TracerStroke {
  let gradient: CanvasGradient | null = null;
  let gradientLength = 0;
  let gradientColor = '';

  function stroke(
    context: CanvasRenderingContext2D,
    length: number,
    color: string,
  ): CanvasGradient {
    if (gradient === null || gradientLength !== length || gradientColor !== color) {
      const next = context.createLinearGradient(0, 0, length, 0);
      next.addColorStop(0, color);
      next.addColorStop(1, 'transparent');

      gradient = next;
      gradientLength = length;
      gradientColor = color;
    }

    return gradient;
  }

  return (context, x, y, angle, from, length, color, alpha) => {
    if (length <= 0 || alpha <= 0) return;

    context.save();
    context.translate(x, y);
    context.rotate(angle);
    // Onto the ray's own start, so the gradient spans exactly what is stroked. Built from the
    // origin and moved to the mark, never built where the mark happens to be.
    context.translate(tracerStart(from), 0);

    context.globalAlpha = alpha;
    context.lineWidth = TRACER_WIDTH_PX;
    context.strokeStyle = stroke(context, length, color);

    context.beginPath();
    context.moveTo(0, 0);
    context.lineTo(length, 0);
    context.stroke();

    context.restore();
  };
}
