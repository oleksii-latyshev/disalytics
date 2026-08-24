import { ANGLE_SCALE, sampleAt, type TickTrack } from '@disa/demo-core';

/** A filled circle, 16px across, for both sides — DESIGN.md §6.1 retires the per-side silhouette. */
export const TOKEN_RADIUS_PX = 8;
/**
 * The token follows the plate's zoom between 12px and 20px across — DESIGN.md §6.1. It is a mark
 * rather than a footprint, so it grows to stay hittable and stops before it starts covering the
 * callout the player is standing in.
 */
export const TOKEN_MIN_RADIUS_PX = 6;
export const TOKEN_MAX_RADIUS_PX = 10;

/** What a token has shrunk to once its player is a body rather than a player: half its own size. */
export const DEAD_RADIUS_FRACTION = 0.5;

const NEEDLE_WIDTH_PX = 2;
const NEEDLE_LENGTH_PX = 10;
/** Scoped in, a player is looking much further than they are turning — DESIGN.md §6.1. */
const NEEDLE_SCOPED_LENGTH_PX = 18;

/**
 * Where a player is looking, on the plate. World yaw counts anticlockwise from +X while radar rows
 * count downward — the same inversion `radarY` carries — so the screen angle is its negative.
 */
export function screenAngle(track: TickTrack, sample: number): number {
  return (-sampleAt(track.yaw, sample) / ANGLE_SCALE) * (Math.PI / 180);
}

function traceToken(context: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
  context.beginPath();
  context.arc(x, y, radius, 0, 2 * Math.PI);
}

/** No stroke: the ring a token can carry is selection, and nothing else — DESIGN.md §6.1. */
export function drawToken(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  fill: string,
): void {
  context.fillStyle = fill;
  traceToken(context, x, y, radius);
  context.fill();
}

/**
 * The hit, laid over the token that took it. Its opacity is the caller's, and the caller reads it
 * off the clock: an opacity driven by wall time would be an animation, which §8 forbids during
 * playback.
 */
export function drawDamageFlash(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
): void {
  drawToken(context, x, y, radius, color);
}

const BLIND_DISC_ALPHA = 0.5;

/**
 * What is left of a flash, covering the token and sweeping away anticlockwise. A flashed player is
 * not looking anywhere, and this is how much longer that stays true — DESIGN.md §6.1.
 */
export function drawBlindDisc(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  remaining: number,
  color: string,
  alpha: number,
): void {
  const start = -Math.PI / 2;

  context.save();
  context.globalAlpha = alpha * BLIND_DISC_ALPHA;
  context.fillStyle = color;

  context.beginPath();
  context.moveTo(x, y);
  context.arc(x, y, radius, start, start - remaining * 2 * Math.PI, true);
  context.closePath();
  context.fill();
  context.restore();
}

/** How far the ring sits outside the token, so selection reads as state and not as a bigger player. */
const SELECTION_GAP_PX = 2;
const SELECTION_WIDTH_PX = 1.5;
const SELECTION_EDGE_WIDTH_PX = 1;

/**
 * The one stroke a token may carry. It is drawn twice because it has to stay legible against both
 * side colours *and* against the plate: white outside, `--accent` on its inner edge — DESIGN.md
 * §6.1.
 */
export function drawSelectionRing(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  ring: string,
  edge: string,
): void {
  const inner = radius + SELECTION_EDGE_WIDTH_PX / 2;

  context.lineWidth = SELECTION_EDGE_WIDTH_PX;
  context.strokeStyle = edge;
  traceToken(context, x, y, inner);
  context.stroke();

  context.lineWidth = SELECTION_WIDTH_PX;
  context.strokeStyle = ring;
  traceToken(context, x, y, radius + SELECTION_GAP_PX + SELECTION_WIDTH_PX / 2);
  context.stroke();
}

/** How far the arc sits outside the token, so it reads as a state and not as a bigger player. */
const ARC_GAP_PX = 3.5;
const ARC_WIDTH_PX = 2;

/** Planting or defusing, filling clockwise from the top — DESIGN.md §6.1. */
export function drawProgressArc(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  progress: number,
  color: string,
): void {
  const start = -Math.PI / 2;

  context.lineWidth = ARC_WIDTH_PX;
  context.strokeStyle = color;

  context.beginPath();
  context.arc(x, y, radius + ARC_GAP_PX, start, start + progress * 2 * Math.PI);
  context.stroke();
}

const AUDIBLE_RING_WIDTH_PX = 1;
const AUDIBLE_RING_ALPHA = 0.4;

/** How far the player can be heard from. Drawn only when they are making noise at all. */
export function drawAudibleRing(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  alpha: number,
): void {
  context.save();
  context.globalAlpha = alpha * AUDIBLE_RING_ALPHA;
  context.lineWidth = AUDIBLE_RING_WIDTH_PX;
  context.strokeStyle = color;

  context.beginPath();
  context.arc(x, y, radius, 0, 2 * Math.PI);
  context.stroke();
  context.restore();
}

/** A direction rather than an area: ten translucent cones is a fog — DESIGN.md §6.1. */
export function drawNeedle(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  angle: number,
  isScoped: boolean,
  color: string,
): void {
  const length = radius + (isScoped ? NEEDLE_SCOPED_LENGTH_PX : NEEDLE_LENGTH_PX);
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);

  context.lineWidth = NEEDLE_WIDTH_PX;
  context.strokeStyle = color;

  context.beginPath();
  context.moveTo(x + dx * radius, y + dy * radius);
  context.lineTo(x + dx * length, y + dy * length);
  context.stroke();
}
