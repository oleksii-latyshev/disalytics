import type { RadarPoint } from '@disa/map-data';
import type { PlateGeometry } from '@/features/radar';
import type { PlayerLeg } from './tactic-schedule';

const BROKEN_DASH_ON = 3;
const BROKEN_DASH_OFF = 7;

export interface RouteStroke {
  readonly color: string;
  readonly under: string;
  readonly width: number;
  readonly alpha: number;
  /** Dashes of the whole stroke; segments the grid could not join always dash. */
  readonly dash?: readonly number[] | undefined;
  readonly dashOffset?: number | undefined;
}

const NO_DASH: number[] = [];
const BROKEN_DASH = [BROKEN_DASH_ON, BROKEN_DASH_OFF];

function paint(
  context: CanvasRenderingContext2D,
  stroke: RouteStroke,
  isBroken: boolean,
  trace: () => void,
): void {
  const dash = isBroken ? BROKEN_DASH : (stroke.dash ?? NO_DASH);
  context.globalAlpha = stroke.alpha;
  context.lineCap = 'round';
  context.lineJoin = 'round';

  context.setLineDash(NO_DASH);
  context.strokeStyle = stroke.under;
  context.lineWidth = stroke.width + 4;
  context.beginPath();
  trace();
  context.stroke();

  context.setLineDash(dash);
  context.lineDashOffset = stroke.dashOffset ?? 0;
  context.strokeStyle = stroke.color;
  context.lineWidth = stroke.width;
  context.beginPath();
  trace();
  context.stroke();
  context.setLineDash(NO_DASH);
}

/**
 * A walked route on an underlay of the plate's ground, so it reads over any map colour. Stops at
 * point `upTo` (and `endX`/`endY` between that and the next) when given, which is how a route is
 * drawn as far as the player has run.
 */
export function strokeLeg(
  context: CanvasRenderingContext2D,
  leg: PlayerLeg,
  geometry: PlateGeometry,
  stroke: RouteStroke,
  progress?: { readonly upTo: number; readonly endX: number; readonly endY: number },
): void {
  const last = progress === undefined ? leg.xs.length - 1 : progress.upTo;
  const { scale, offsetX, offsetY } = geometry;

  context.save();
  let runStart = 0;
  for (let i = 0; i < last; i++) {
    const isBroken = leg.breaks.includes(i);
    const isRunEnd = i === last - 1 || leg.breaks.includes(i + 1) !== isBroken;
    if (!isRunEnd) continue;

    const from = runStart;
    const to = i + 1;
    paint(context, stroke, isBroken, () => {
      context.moveTo((leg.xs[from] ?? 0) * scale + offsetX, (leg.ys[from] ?? 0) * scale + offsetY);
      for (let j = from + 1; j <= to; j++) {
        context.lineTo((leg.xs[j] ?? 0) * scale + offsetX, (leg.ys[j] ?? 0) * scale + offsetY);
      }
      if (progress !== undefined && to === last) {
        context.lineTo(progress.endX * scale + offsetX, progress.endY * scale + offsetY);
      }
    });
    runStart = to;
  }

  if (progress !== undefined && last === 0) {
    paint(context, stroke, false, () => {
      context.moveTo((leg.xs[0] ?? 0) * scale + offsetX, (leg.ys[0] ?? 0) * scale + offsetY);
      context.lineTo(progress.endX * scale + offsetX, progress.endY * scale + offsetY);
    });
  }
  context.restore();
}

export function strokePoints(
  context: CanvasRenderingContext2D,
  points: readonly RadarPoint[],
  geometry: PlateGeometry,
  stroke: RouteStroke,
): void {
  const first = points[0];
  if (first === undefined || points.length < 2) return;
  const { scale, offsetX, offsetY } = geometry;
  context.save();
  paint(context, stroke, false, () => {
    context.moveTo(first.x * scale + offsetX, first.y * scale + offsetY);
    for (const point of points.slice(1)) {
      context.lineTo(point.x * scale + offsetX, point.y * scale + offsetY);
    }
  });
  context.restore();
}

/** The mark of where a route ends: a dashed ring holding the player's number. */
export function drawEndGhost(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  label: string,
  colors: { readonly ring: string; readonly ground: string },
  alpha: number,
): void {
  context.save();
  context.globalAlpha = alpha;
  context.fillStyle = colors.ground;
  context.strokeStyle = colors.ring;
  context.lineWidth = 2;
  context.setLineDash([3, 3]);
  context.beginPath();
  context.arc(x, y, radius * 0.85, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.setLineDash(NO_DASH);
  context.fillStyle = colors.ring;
  context.font = `600 ${Math.round(radius * 0.8)}px IBM Plex Mono, monospace`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(label, x, y + 0.5);
  context.restore();
}

export function drawHandle(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  colors: { readonly ring: string; readonly ground: string },
  isHovered: boolean,
): void {
  context.save();
  context.fillStyle = colors.ground;
  context.strokeStyle = colors.ring;
  context.lineWidth = 3;
  context.beginPath();
  context.arc(x, y, (isHovered ? 8 : 6) * scale, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.restore();
}
