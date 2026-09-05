import {
  type GrenadeTrajectory,
  type GrenadeType,
  type PlayerSlot,
  sampleAt,
} from '@disa/demo-core';
import type { MapOverview } from '@disa/map-data';
import { radarX, radarY } from '@disa/map-data';
import type { TrajectoryVisibility } from '@/core/settings';
import type { RadarColors } from './colors';

/**
 * What colour a grenade is drawn in, wherever it is drawn — the mark it leaves on the ground and the
 * object itself while it is still in the air. Stated once so the two cannot disagree: a smoke on its
 * way and the cloud it becomes are the same reading, and a flash borrows `blind` because what a
 * flashbang leaves behind is on the players rather than on the map.
 *
 * Exhaustive with no `default`, so a new `GrenadeType` is a compile error rather than a colourless
 * mark.
 */
export function grenadeColor(type: GrenadeType, colors: RadarColors): string {
  switch (type) {
    case 'smokegrenade':
      return colors.nadeSmoke;
    case 'molotov':
    case 'incgrenade':
      return colors.nadeMolotov;
    case 'hegrenade':
      return colors.nadeHe;
    case 'flashbang':
      return colors.blind;
    case 'decoy':
      return colors.nadeDecoy;
  }
}

// ── trajectory ──────────────────────────────────────────────────────────────

/**
 * Whether a grenade in flight draws its path — `docs/DESIGN.md` §10.5's trajectories row.
 *
 * `selected` narrows `flight` rather than replacing it: §6.2 draws a path for a grenade in the air
 * and for a grenade the reader has picked out, and the only thing on this screen a reader picks out
 * is a player (§6.1), so the narrow answer is *that player's* grenades. With nobody selected it
 * draws nothing, which is the honest reading of "selected only".
 */
export function isTrajectoryDrawn(
  visibility: TrajectoryVisibility,
  thrower: PlayerSlot,
  selectedSlot: PlayerSlot | null,
): boolean {
  if (visibility === 'off') return false;

  return visibility === 'flight' || thrower === selectedSlot;
}

const TRAJECTORY_ALPHA = 0.35;
const TRAJECTORY_WIDTH_PX = 1;

/**
 * The path's ink, on its own so that a drawing which is not a grenade's own trajectory — §10.6's
 * legend — strokes the line with these values rather than with a second copy of them.
 */
export function trajectoryStroke(context: CanvasRenderingContext2D, color: string): void {
  context.globalAlpha = TRAJECTORY_ALPHA;
  context.strokeStyle = color;
  context.lineWidth = TRAJECTORY_WIDTH_PX;
}

/**
 * A grenade's flight path clipped to `clipCount` positions. White, 1px, α0.35 — not in the
 * utility's colour, because a path is not the grenade — §6.2.
 */
export function drawTrajectory(
  context: CanvasRenderingContext2D,
  trajectory: GrenadeTrajectory,
  clipCount: number,
  overview: MapOverview,
  scale: number,
  color: string,
): void {
  if (clipCount < 2) return;

  context.save();
  trajectoryStroke(context, color);
  context.beginPath();

  const startX = radarX(overview, sampleAt(trajectory.x, 0)) * scale;
  const startY = radarY(overview, sampleAt(trajectory.y, 0)) * scale;
  context.moveTo(startX, startY);

  for (let i = 1; i < clipCount; i++) {
    const px = radarX(overview, sampleAt(trajectory.x, i)) * scale;
    const py = radarY(overview, sampleAt(trajectory.y, i)) * scale;
    context.lineTo(px, py);
  }

  context.stroke();
  context.restore();
}

// ── HE grenade ring ─────────────────────────────────────────────────────────

const HE_RING_WIDTH_PX = 2;
const HE_RING_ALPHA = 0.75;

/**
 * An HE: a ring that opens to the blast's own radius and then fades where it stopped — #170.
 *
 * **It is a ring at every moment of its life**, and that is what tells it from a flashbang's filled
 * wash without either of them relying on its colour. It was a ring for 0.2 s and then a 4px dot for
 * a second, which is two marks where one was needed and a dot that said nothing about the blast.
 * The dot is gone; what lingers is the ring, at the size the explosion actually reached.
 */
export function drawHeRing(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  progress: number,
  radiusPx: number,
  isLinger: boolean,
  color: string,
): void {
  // Open, then hold: the ring stops growing when the blast does, and only its ink moves after that.
  const radius = isLinger ? radiusPx : radiusPx * progress;
  const alpha = HE_RING_ALPHA * (isLinger ? 1 - progress : 1);
  if (radius <= 0 || alpha <= 0) return;

  context.save();
  context.globalAlpha = alpha;
  context.strokeStyle = color;
  context.lineWidth = HE_RING_WIDTH_PX;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.stroke();
  context.restore();
}

// ── flashbang mark ──────────────────────────────────────────────────────────

const FLASH_PEAK_ALPHA = 0.55;

/**
 * A flashbang: a filled wash that opens and goes — #170, and the shape an HE is not.
 *
 * Two things changed with it. It **fills** where the HE strokes, so the pair is told apart by shape
 * rather than by hue, which matters to a reader who cannot separate the two colours at all. And its
 * radius is the grenade's own in world units instead of a flat 12px, so it covers the same ground at
 * every zoom the way every other mark on this plate does.
 *
 * Nothing lingers, because what a flash leaves behind is on the players it caught (§6.1).
 */
export function drawFlashMark(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  progress: number,
  radiusPx: number,
  color: string,
): void {
  const radius = radiusPx * progress;
  const alpha = FLASH_PEAK_ALPHA * (1 - progress);
  if (radius <= 0 || alpha <= 0) return;

  context.save();
  context.globalAlpha = alpha;
  context.fillStyle = color;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

// ── decoy pulsing mark ──────────────────────────────────────────────────────

const DECOY_MIN_RADIUS_PX = 2;
const DECOY_MAX_RADIUS_PX = 5;

/**
 * A small pulsing mark — "a lie the reader should be able to see was told" — §6.2.
 * `pulsePhase` is [0..1], fed to a sine curve.
 */
export function drawDecoyPulse(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  pulsePhase: number,
  color: string,
): void {
  const t = Math.sin(pulsePhase * Math.PI * 2) * 0.5 + 0.5;
  const radius = DECOY_MIN_RADIUS_PX + t * (DECOY_MAX_RADIUS_PX - DECOY_MIN_RADIUS_PX);
  const alpha = 0.3 + t * 0.3;

  context.save();
  context.globalAlpha = alpha;
  context.fillStyle = color;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
  context.restore();
}
