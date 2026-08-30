import { asTick, type Grenade, type GrenadeType, type Tick } from '../schema';

// ── CS2 engine constants ────────────────────────────────────────────────────
// Named approximations, same approach as `audibility.ts`. These are not published by Valve; the
// numbers are calibrated against demo playback with developer overlay enabled.

/** Effective radius of a smoke grenade cloud, in world units. */
export const SMOKE_RADIUS_UNITS = 144;

/** Effective radius of a molotov / incendiary fire area, in world units. */
export const MOLOTOV_RADIUS_UNITS = 180;

/** Effective radius of an HE grenade explosion, in world units. */
export const HE_RADIUS_UNITS = 350;

// ── visual timing constants ─────────────────────────────────────────────────
// All durations are in **match** seconds, so at 2× speed the ring expands twice as fast and at
// 0.5× it takes twice as long — the draw is a function of `clock.frame`, not wall time.

/** How long the HE expanding ring takes to reach its radius — §6.2. */
export const HE_EXPAND_SECONDS = 0.2;

/** How long the HE static glyph lingers after the ring — §6.2. */
export const HE_LINGER_SECONDS = 1.0;

/** How long the flash expanding mark takes to reach its peak — §6.2. */
export const FLASH_EXPAND_SECONDS = 0.15;

/** How long the smoke / molotov disc alpha fades before expiry — §6.2. */
export const AREA_FADE_SECONDS = 2.0;

/** What a smoke cloud is drawn at while it is not fading — §6.2. */
export const SMOKE_AREA_ALPHA = 0.3;

/** And a fire area, which is thinner because it is read through — §6.2. */
export const FIRE_AREA_ALPHA = 0.25;

/** Pulse frequency of a decoy mark, in Hz of match time — §6.2. */
export const DECOY_PULSE_HZ = 2;

// ── the end of a flight ─────────────────────────────────────────────────────

// Ordering slack past the projectile's last sample, matching `DETONATION_SLACK_TICKS` in
// `crates/demo-parser/src/grenades.rs`: the entity leaves the world before the event that says why.
const FLIGHT_SLACK_SECONDS = 1;

/**
 * The longest a grenade stays on the plate after its throw, used to terminate the walk in
 * [`visibleGrenades`]. The fixture's longest throw-to-expiry is 26.7 s (a smoke), so this is a
 * bound with headroom rather than a measurement.
 */
const MAX_VISUAL_SECONDS = 45;

/**
 * The tick a grenade stops being in the air.
 *
 * `detonationTick` is `null` whenever the crate could not match a detonation event to the
 * projectile, which is a normal fraction of any match and **not** a grenade that is still flying.
 * The trajectory is what bounds it in that case: the projectile stops being sampled when it stops
 * existing, so its last sample plus the crate's own ordering slack is the end.
 */
export function flightEndTick(grenade: Grenade, tickRate: number): Tick {
  if (grenade.detonationTick !== null) return grenade.detonationTick;

  const { trajectory } = grenade;
  const lastSampleTick =
    trajectory.sampleCount > 0 && trajectory.sampleHz > 0
      ? (trajectory.firstTick as number) +
        ((trajectory.sampleCount - 1) * tickRate) / trajectory.sampleHz
      : (grenade.throwTick as number);

  return asTick(Math.ceil(lastSampleTick + FLIGHT_SLACK_SECONDS * tickRate));
}

/** Whether the projectile is in the air at `tick` — between the throw and [`flightEndTick`]. */
export function isInFlight(grenade: Grenade, tick: Tick, tickRate: number): boolean {
  return tick >= grenade.throwTick && tick < flightEndTick(grenade, tickRate);
}

// ── grenade visual phase ────────────────────────────────────────────────────

/**
 * What phase a grenade is in, written into a caller-owned scratch to avoid per-frame allocation.
 * Each phase carries enough state for the draw functions in `features/radar/helpers/grenades.ts`.
 *
 * - `'flight'`  — projectile in the air, draw trajectory
 * - `'expand'`  — HE/flash expanding ring, `progress` goes 0→1
 * - `'active'`  — smoke/molotov/decoy area on the ground, `alpha` is current opacity, `remaining`
 *                 is the [0..1] fraction of life left (drives the depleting ring)
 * - `'linger'`  — HE static glyph after the ring has expanded
 * - `null`      — not visible at this tick
 */
export type GrenadePhase = 'flight' | 'expand' | 'active' | 'linger';

export interface GrenadeVisualScratch {
  phase: GrenadePhase | null;
  /** [0..1] expansion progress for HE/flash rings. */
  progress: number;
  /** Current opacity for smoke/molotov disc. */
  alpha: number;
  /** [0..1] remaining life fraction for the depleting ring. */
  remaining: number;
  /** [0..1] decoy pulse phase — fed to a sine curve by the draw. */
  pulsePhase: number;
}

/** Allocate once, reuse every frame. */
export function createVisualScratch(): GrenadeVisualScratch {
  return { phase: null, progress: 0, alpha: 0, remaining: 0, pulsePhase: 0 };
}

// ── visual state computation ────────────────────────────────────────────────

/** The total visual lifetime of an HE after detonation. */
const HE_TOTAL_SECONDS = HE_EXPAND_SECONDS + HE_LINGER_SECONDS;

/**
 * An expanding mark that may leave a static glyph behind it — the HE ring and the flash mark, which
 * differ only in whether anything lingers. A flashbang passes the same value for both bounds, so
 * its whole visual life *is* its expansion and the linger branch can never be reached.
 */
function writeBurst(
  out: GrenadeVisualScratch,
  elapsed: number,
  expandSeconds: number,
  totalSeconds: number,
): void {
  if (elapsed < expandSeconds) {
    out.phase = 'expand';
    out.progress = elapsed / expandSeconds;
  } else if (elapsed < totalSeconds) {
    out.phase = 'linger';
  }
}

/**
 * An area standing on the ground until its expiry — a smoke cloud or a fire, which are the same
 * shape and differ only in what they are drawn at. §6.2 gives fire the thinner alpha because it is
 * read through, and that constant is the whole of the difference.
 *
 * The two null checks are the function's own rather than the caller's: `expiryTick` and
 * `detonationTick` are both nullable on `Grenade`, so an area with no ending has none here either.
 */
function writeArea(
  out: GrenadeVisualScratch,
  grenade: Grenade,
  tick: Tick,
  tickRate: number,
  peakAlpha: number,
): void {
  if (grenade.expiryTick === null || grenade.detonationTick === null) return;
  if (tick > grenade.expiryTick) return;

  const totalTicks = (grenade.expiryTick as number) - (grenade.detonationTick as number);
  const remainingTicks = (grenade.expiryTick as number) - (tick as number);
  const remainingSeconds = remainingTicks / tickRate;

  out.phase = 'active';
  out.remaining = totalTicks > 0 ? remainingTicks / totalTicks : 0;
  out.alpha =
    remainingSeconds <= AREA_FADE_SECONDS
      ? peakAlpha * (remainingSeconds / AREA_FADE_SECONDS)
      : peakAlpha;
}

/** A decoy, which stands until its expiry and pulses rather than depleting. */
function writeDecoy(
  out: GrenadeVisualScratch,
  grenade: Grenade,
  tick: Tick,
  elapsed: number,
): void {
  if (grenade.expiryTick === null || tick > grenade.expiryTick) return;

  out.phase = 'active';
  // Pulse phase wraps [0..1] at DECOY_PULSE_HZ, so the draw can sin(phase * 2π).
  out.pulsePhase = (elapsed * DECOY_PULSE_HZ) % 1;
  out.remaining = 1;
  out.alpha = 1;
}

/**
 * Computes the visual state of a grenade at a given tick and writes it into `out`. Returns `out`
 * for convenience — no allocation.
 *
 * The caller must check `out.phase !== null` before drawing. All math is tick arithmetic:
 * `elapsed = (tick - grenade.detonationTick) / tickRate` gives match seconds.
 */
export function grenadeVisual(
  grenade: Grenade,
  tick: Tick,
  tickRate: number,
  out: GrenadeVisualScratch,
): GrenadeVisualScratch {
  out.phase = null;
  out.progress = 0;
  out.alpha = 0;
  out.remaining = 0;
  out.pulsePhase = 0;

  if (tick < grenade.throwTick) return out;

  if (isInFlight(grenade, tick, tickRate)) {
    out.phase = 'flight';
    return out;
  }

  // A grenade whose detonation never arrived has no ending to draw once the flight is over.
  if (grenade.detonationTick === null) return out;

  const elapsed = ((tick as number) - (grenade.detonationTick as number)) / tickRate;

  switch (grenade.type) {
    case 'hegrenade':
      writeBurst(out, elapsed, HE_EXPAND_SECONDS, HE_TOTAL_SECONDS);
      break;
    case 'flashbang':
      writeBurst(out, elapsed, FLASH_EXPAND_SECONDS, FLASH_EXPAND_SECONDS);
      break;
    case 'smokegrenade':
      writeArea(out, grenade, tick, tickRate, SMOKE_AREA_ALPHA);
      break;
    case 'molotov':
    case 'incgrenade':
      writeArea(out, grenade, tick, tickRate, FIRE_AREA_ALPHA);
      break;
    case 'decoy':
      writeDecoy(out, grenade, tick, elapsed);
      break;
  }

  return out;
}

// ── trajectory clipping ─────────────────────────────────────────────────────

/**
 * How many trajectory samples to draw for a grenade at the current tick. Returns 0 if the grenade
 * has not been thrown yet, and `trajectory.sampleCount` once it has landed.
 */
export function trajectoryClipCount(grenade: Grenade, tick: Tick, tickRate: number): number {
  const { trajectory } = grenade;
  if (trajectory.sampleCount === 0) return 0;
  if (tick < grenade.throwTick) return 0;

  // Past detonation: draw the full trajectory.
  if (grenade.detonationTick !== null && tick >= grenade.detonationTick) {
    return trajectory.sampleCount;
  }

  // In flight: clip to the current tick.
  const elapsedTicks = (tick as number) - (trajectory.firstTick as number);
  if (elapsedTicks <= 0) return 1; // At least the start point.

  const samplesPerTick =
    trajectory.sampleHz > 0 && tickRate > 0 ? trajectory.sampleHz / tickRate : 1;
  const index = Math.ceil(elapsedTicks * samplesPerTick);

  return Math.min(index + 1, trajectory.sampleCount);
}

// ── active grenade collection ───────────────────────────────────────────────

/**
 * Whether a grenade that has already gone off is still drawn at `tick`. The four types with an
 * expiry answer the same question, so they answer it in one arm: an area is on the plate until the
 * event that ends it, and a burst is on the plate for its own fixed span.
 *
 * Exhaustive with no `default`, so a new `GrenadeType` is a compile error rather than a grenade
 * that silently never appears.
 */
function isVisibleAfterDetonation(grenade: Grenade, tick: Tick, elapsed: number): boolean {
  switch (grenade.type) {
    case 'hegrenade':
      return elapsed < HE_TOTAL_SECONDS;
    case 'flashbang':
      return elapsed < FLASH_EXPAND_SECONDS;
    case 'smokegrenade':
    case 'molotov':
    case 'incgrenade':
    case 'decoy':
      return grenade.expiryTick !== null && tick <= grenade.expiryTick;
  }
}

/**
 * Which grenades are visible at `tick`, determined by type-specific rules above. Writes indices
 * into the `out` array and returns the count written. The caller pre-allocates `out` once per demo
 * and reuses it every frame — no allocation in the draw loop.
 *
 * Grenades are sorted by `throwTick`, so the search starts from the most recent and walks backward
 * until one was thrown longer than [`MAX_VISUAL_SECONDS`] ago — everything before it is older
 * still, which is what keeps the walk bounded by the window rather than by the match.
 */
export function visibleGrenades(
  grenades: readonly Grenade[],
  tick: Tick,
  tickRate: number,
  out: Int32Array,
): number {
  let count = 0;
  const oldestVisibleTick = (tick as number) - MAX_VISUAL_SECONDS * tickRate;

  for (let i = grenades.length - 1; i >= 0; i--) {
    const g = grenades[i];
    if (g === undefined) continue;

    if ((g.throwTick as number) < oldestVisibleTick) break;

    // Not thrown yet.
    if (g.throwTick > tick) continue;

    if (isInFlight(g, tick, tickRate)) {
      out[count++] = i;
      continue;
    }

    // A grenade whose detonation never arrived has no ending to draw.
    if (g.detonationTick === null) continue;

    const elapsed = ((tick as number) - (g.detonationTick as number)) / tickRate;
    if (isVisibleAfterDetonation(g, tick, elapsed)) out[count++] = i;
  }

  return count;
}

/**
 * Returns the appropriate radius in world units for a grenade's area, or 0 if the type has no area.
 */
export function grenadeRadiusUnits(type: GrenadeType): number {
  switch (type) {
    case 'hegrenade':
      return HE_RADIUS_UNITS;
    case 'smokegrenade':
      return SMOKE_RADIUS_UNITS;
    case 'molotov':
    case 'incgrenade':
      return MOLOTOV_RADIUS_UNITS;
    default:
      return 0;
  }
}
