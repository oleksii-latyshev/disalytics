import { ANGLE_SCALE, sampleAt, type Team, type TickTrack } from '@disa/demo-core';

export const TOKEN_RADIUS_PX = 5;
const TOKEN_OUTLINE_PX = 1.5;

const NEEDLE_WIDTH_PX = 2;
const NEEDLE_LENGTH_PX = 13;
/** Scoped in, a player is looking much further than they are turning — DESIGN.md §7. */
const NEEDLE_SCOPED_LENGTH_PX = 22;

/**
 * Where a player is looking, on the plate. World yaw counts anticlockwise from +X while radar rows
 * count downward — the same inversion `radarY` carries — so the screen angle is its negative.
 */
export function screenAngle(track: TickTrack, sample: number): number {
  return (-sampleAt(track.yaw, sample) / ANGLE_SCALE) * (Math.PI / 180);
}

/**
 * Side identity carries in shape as well as colour — `DESIGN.md` §2 rules out relying on hue,
 * which a colour-blind reader may not have.
 */
function traceToken(context: CanvasRenderingContext2D, x: number, y: number, team: Team): void {
  context.beginPath();

  if (team === 'CT') {
    context.arc(x, y, TOKEN_RADIUS_PX, 0, 2 * Math.PI);
    return;
  }

  context.moveTo(x, y - TOKEN_RADIUS_PX);
  context.lineTo(x + TOKEN_RADIUS_PX, y);
  context.lineTo(x, y + TOKEN_RADIUS_PX);
  context.lineTo(x - TOKEN_RADIUS_PX, y);
  context.closePath();
}

export function drawToken(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  team: Team,
  fill: string,
  outline: string,
): void {
  context.lineWidth = TOKEN_OUTLINE_PX;
  context.strokeStyle = outline;
  context.fillStyle = fill;

  traceToken(context, x, y, team);
  context.fill();
  context.stroke();
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
  team: Team,
  color: string,
): void {
  context.fillStyle = color;
  traceToken(context, x, y, team);
  context.fill();
}

/** How far the arc sits outside the token, so it reads as a state and not as a bigger player. */
const ARC_GAP_PX = 3.5;
const ARC_WIDTH_PX = 2;

/** Planting or defusing, filling clockwise from the top — DESIGN.md §7. */
export function drawProgressArc(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  progress: number,
  color: string,
): void {
  const start = -Math.PI / 2;

  context.lineWidth = ARC_WIDTH_PX;
  context.strokeStyle = color;

  context.beginPath();
  context.arc(x, y, TOKEN_RADIUS_PX + ARC_GAP_PX, start, start + progress * 2 * Math.PI);
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

/** A direction rather than an area: ten translucent cones is a fog — DESIGN.md §7. */
export function drawNeedle(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  isScoped: boolean,
  color: string,
): void {
  const length = isScoped ? NEEDLE_SCOPED_LENGTH_PX : NEEDLE_LENGTH_PX;
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);

  context.lineWidth = NEEDLE_WIDTH_PX;
  context.strokeStyle = color;

  context.beginPath();
  context.moveTo(x + dx * TOKEN_RADIUS_PX, y + dy * TOKEN_RADIUS_PX);
  context.lineTo(x + dx * length, y + dy * length);
  context.stroke();
}
