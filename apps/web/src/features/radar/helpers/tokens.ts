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
