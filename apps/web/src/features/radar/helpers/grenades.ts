import { type GrenadeTrajectory, type PlayerSlot, sampleAt } from '@disa/demo-core';
import type { MapOverview } from '@disa/map-data';
import { radarX, radarY } from '@disa/map-data';
import type { TrajectoryVisibility } from '@/core/settings';

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

// ── smoke cloud ─────────────────────────────────────────────────────────────

/**
 * A soft disc with a 1px depleting ring that shows how much life remains. The ring sweeps clockwise
 * from 12 o'clock, so a full ring is a fresh smoke and no ring is about to expire — §6.2.
 */
export function drawSmokeCloud(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radiusPx: number,
  alpha: number,
  remaining: number,
  color: string,
): void {
  // Soft disc.
  context.save();
  context.globalAlpha = alpha;
  context.fillStyle = color;
  context.beginPath();
  context.arc(x, y, radiusPx, 0, Math.PI * 2);
  context.fill();

  // Depleting ring: 1px, same colour, full alpha relative to the disc.
  if (remaining > 0) {
    context.globalAlpha = Math.min(alpha + 0.15, 0.6);
    context.strokeStyle = color;
    context.lineWidth = 1;
    context.beginPath();
    const start = -Math.PI / 2;
    context.arc(x, y, radiusPx, start, start + remaining * Math.PI * 2);
    context.stroke();
  }

  context.restore();
}

// ── molotov / incendiary area ───────────────────────────────────────────────

/** How many angular slices the jittered edge uses. More looks softer. */
const MOLOTOV_EDGE_SEGMENTS = 24;
/** Max jitter as a fraction of radius. */
const MOLOTOV_JITTER = 0.15;

/**
 * A fire area with a "soft irregular edge" — radius jittered per angle, seeded by `seed` so the
 * shape is deterministic for the same grenade. Same depleting ring as smoke — §6.2.
 */
export function drawMolotovArea(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radiusPx: number,
  alpha: number,
  remaining: number,
  color: string,
  seed: number,
): void {
  context.save();
  context.globalAlpha = alpha;
  context.fillStyle = color;
  context.beginPath();

  // Jittered polygon — seed drives a simple deterministic hash per segment.
  for (let i = 0; i <= MOLOTOV_EDGE_SEGMENTS; i++) {
    const angle = (i / MOLOTOV_EDGE_SEGMENTS) * Math.PI * 2;
    // Simple hash: sin of seed + segment gives stable per-segment jitter.
    const jitter = 1 + Math.sin(seed * 127.1 + i * 311.7) * MOLOTOV_JITTER;
    const r = radiusPx * jitter;
    const px = x + Math.cos(angle) * r;
    const py = y + Math.sin(angle) * r;
    if (i === 0) {
      context.moveTo(px, py);
    } else {
      context.lineTo(px, py);
    }
  }

  context.closePath();
  context.fill();

  // Depleting ring.
  if (remaining > 0) {
    context.globalAlpha = Math.min(alpha + 0.15, 0.6);
    context.strokeStyle = color;
    context.lineWidth = 1;
    context.beginPath();
    const start = -Math.PI / 2;
    context.arc(x, y, radiusPx, start, start + remaining * Math.PI * 2);
    context.stroke();
  }

  context.restore();
}

// ── HE grenade ring ─────────────────────────────────────────────────────────

const HE_RING_WIDTH_PX = 2;
const HE_GLYPH_RADIUS_PX = 4;

/**
 * HE: an expanding ring that reaches the effective radius over ~200ms, then a small static glyph
 * for ~1s — §6.2. `progress` goes 0→1 during expansion; when `isLinger` is true, the glyph
 * replaces the ring.
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
  context.save();

  if (isLinger) {
    // Static glyph: a small filled circle.
    context.globalAlpha = 0.5;
    context.fillStyle = color;
    context.beginPath();
    context.arc(x, y, HE_GLYPH_RADIUS_PX, 0, Math.PI * 2);
    context.fill();
  } else {
    // Expanding ring.
    const currentRadius = radiusPx * progress;
    context.globalAlpha = 0.6 * (1 - progress * 0.3); // Fade slightly as it expands.
    context.strokeStyle = color;
    context.lineWidth = HE_RING_WIDTH_PX;
    context.beginPath();
    context.arc(x, y, currentRadius, 0, Math.PI * 2);
    context.stroke();
  }

  context.restore();
}

// ── flashbang mark ──────────────────────────────────────────────────────────

const FLASH_MARK_MAX_RADIUS_PX = 12;

/**
 * A brief expanding mark — no lingering area. What lingers is on the affected players (§6.1) — §6.2.
 */
export function drawFlashMark(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  progress: number,
  color: string,
): void {
  const radius = FLASH_MARK_MAX_RADIUS_PX * progress;
  const alpha = 0.6 * (1 - progress);

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
