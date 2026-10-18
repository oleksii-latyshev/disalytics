import type { PlateGeometry } from '@disa/plate';
import type { PlayerLeg } from './tactic-schedule';

const BROKEN_DASH_ON = 3;
const BROKEN_DASH_OFF = 7;

/** How much of a mark on another floor than the one in view stays visible. */
export const OTHER_FLOOR_ALPHA = 0.28;

/** The strength a mark on `floor` is drawn with while `active` is in view. */
export function floorAlpha(floor: number, active: number): number {
  return floor === active ? 1 : OTHER_FLOOR_ALPHA;
}

export interface RouteStroke {
  readonly color: string;
  readonly under: string;
  readonly width: number;
  readonly alpha: number;
  /** Dashes of the whole stroke; segments the grid could not join always dash. */
  readonly dash?: readonly number[] | undefined;
  readonly dashOffset?: number | undefined;
  /** The floor in view; what is walked on another floor is faded. Floor 0 when absent. */
  readonly activeFloor?: number | undefined;
}

const NO_DASH: number[] = [];
const BROKEN_DASH = [BROKEN_DASH_ON, BROKEN_DASH_OFF];

function paint(
  context: CanvasRenderingContext2D,
  stroke: RouteStroke,
  isBroken: boolean,
  trace: () => void,
  alpha: number = stroke.alpha,
): void {
  const dash = isBroken ? BROKEN_DASH : (stroke.dash ?? NO_DASH);
  context.globalAlpha = alpha;
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

/** The floor segment `i` of a leg lies on, or -1 where it is a connector between two floors. */
function segmentFloor(leg: PlayerLeg, i: number): number {
  const from = leg.floors[i];
  return from === leg.floors[i + 1] ? (from ?? 0) : -1;
}

/**
 * A walked route on an underlay of the plate's ground, so it reads over any map colour. Stops at
 * point `upTo` (and `endX`/`endY` between that and the next) when given, which is how a route is
 * drawn as far as the player has run. The part on another floor than `stroke.activeFloor` is faded
 * and a connector between floors is left to `drawLegLinks`.
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
  const active = stroke.activeFloor ?? 0;

  context.save();
  let runStart = 0;
  for (let i = 0; i < last; i++) {
    const isBroken = leg.breaks.includes(i);
    const floor = segmentFloor(leg, i);
    const isRunEnd =
      i === last - 1 ||
      leg.breaks.includes(i + 1) !== isBroken ||
      segmentFloor(leg, i + 1) !== floor;
    if (!isRunEnd) continue;

    const from = runStart;
    const to = i + 1;
    runStart = to;
    if (floor === -1 && !isBroken) continue;

    const alpha = floor === -1 ? stroke.alpha : stroke.alpha * floorAlpha(floor, active);
    const trace = () => {
      context.moveTo((leg.xs[from] ?? 0) * scale + offsetX, (leg.ys[from] ?? 0) * scale + offsetY);
      for (let j = from + 1; j <= to; j++) {
        context.lineTo((leg.xs[j] ?? 0) * scale + offsetX, (leg.ys[j] ?? 0) * scale + offsetY);
      }
      if (progress !== undefined && to === last) {
        context.lineTo(progress.endX * scale + offsetX, progress.endY * scale + offsetY);
      }
    };
    paint(context, stroke, isBroken, trace, alpha);
  }

  if (progress !== undefined && last === 0) {
    paint(context, stroke, false, () => {
      context.moveTo((leg.xs[0] ?? 0) * scale + offsetX, (leg.ys[0] ?? 0) * scale + offsetY);
      context.lineTo(progress.endX * scale + offsetX, progress.endY * scale + offsetY);
    });
  }
  context.restore();
}

/** A point with a floor, or one on the floor in view where it names none. */
interface MaybeFloorPoint {
  readonly x: number;
  readonly y: number;
  readonly floor?: number | undefined;
}

export function strokePoints(
  context: CanvasRenderingContext2D,
  points: readonly MaybeFloorPoint[],
  geometry: PlateGeometry,
  stroke: RouteStroke,
): void {
  const { scale, offsetX, offsetY } = geometry;
  const active = stroke.activeFloor ?? 0;
  const floorOf = (index: number) => points[index]?.floor ?? active;
  const segmentOf = (index: number) =>
    floorOf(index) === floorOf(index + 1) ? floorOf(index) : -1;
  const last = points.length - 1;

  context.save();
  let runStart = 0;
  for (let i = 0; i < last; i++) {
    if (i < last - 1 && segmentOf(i + 1) === segmentOf(i)) continue;

    const from = runStart;
    runStart = i + 1;
    const floor = segmentOf(i);
    if (floor === -1) continue;
    const trace = () => {
      context.moveTo(
        (points[from]?.x ?? 0) * scale + offsetX,
        (points[from]?.y ?? 0) * scale + offsetY,
      );
      for (let j = from + 1; j <= i + 1; j++) {
        context.lineTo(
          (points[j]?.x ?? 0) * scale + offsetX,
          (points[j]?.y ?? 0) * scale + offsetY,
        );
      }
    };
    paint(context, stroke, false, trace, stroke.alpha * floorAlpha(floor, active));
  }
  context.restore();
}

const LINK_RADIUS = 7;

/**
 * The marks of where a walked route changes floor: a small disc with an up or down chevron, at the
 * connector's end on the floor in view. A change between two floors neither in view is not drawn.
 * `floorRefs` are the floors' altitudes, which say which way is up.
 */
export function drawLegLinks(
  context: CanvasRenderingContext2D,
  leg: PlayerLeg,
  geometry: PlateGeometry,
  floorRefs: readonly number[],
  link: {
    readonly color: string;
    readonly ground: string;
    readonly active: number;
    readonly alpha: number;
  },
): void {
  const { scale, offsetX, offsetY } = geometry;
  for (let i = 0; i < leg.xs.length - 1; i++) {
    const fromFloor = leg.floors[i] ?? 0;
    const toFloor = leg.floors[i + 1] ?? 0;
    if (fromFloor === toFloor || (fromFloor !== link.active && toFloor !== link.active)) continue;

    const at = fromFloor === link.active ? i : i + 1;
    const isUp = (floorRefs[toFloor] ?? 0) > (floorRefs[fromFloor] ?? 0);
    drawLinkMark(
      context,
      (leg.xs[at] ?? 0) * scale + offsetX,
      (leg.ys[at] ?? 0) * scale + offsetY,
      isUp,
      link,
    );
  }
}

function drawLinkMark(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  isUp: boolean,
  colors: { readonly color: string; readonly ground: string; readonly alpha: number },
): void {
  const dir = isUp ? 1 : -1;
  context.save();
  context.globalAlpha = colors.alpha;
  context.fillStyle = colors.ground;
  context.strokeStyle = colors.color;
  context.lineWidth = 2;
  context.beginPath();
  context.arc(x, y, LINK_RADIUS, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.beginPath();
  context.moveTo(x - 3.5, y - dir * 1.5);
  context.lineTo(x, y - dir * 4.5);
  context.lineTo(x + 3.5, y - dir * 1.5);
  context.moveTo(x - 3.5, y + dir * 2.5);
  context.lineTo(x, y - dir * 0.5);
  context.lineTo(x + 3.5, y + dir * 2.5);
  context.stroke();
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
