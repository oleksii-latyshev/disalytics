//! What a grenade *looks like* at one tick — the phase it is in, how far a body has grown, and how
//! much ink is left on it. Which grenades are on the plate at all is `grenade-state.ts`, and the
//! dependency runs one way: a bound needs a duration, a duration needs nothing.

import type { Grenade, Tick } from '../schema';
import { isInFlight } from './grenade-flight';

// ── visual timing constants ─────────────────────────────────────────────────
// All durations are in **match** seconds, so at 2× speed the ring expands twice as fast and at
// 0.5× it takes twice as long — the draw is a function of `clock.frame`, not wall time.

/**
 * How long the HE ring takes to reach its radius, and how long it then fades in place.
 *
 * Both are longer than the explosion is. That is deliberate and it is the answer to #170: 0.2 s of
 * match time at 1× is a flicker, and a reader who cannot tell an HE from a flash from a throw that
 * did nothing has not been told anything. What the mark owes the reader is *noticeable*, and the
 * shape rather than the duration is what keeps it honest — a ring is an HE and a filled wash is a
 * flash, at every moment of both.
 */
export const HE_EXPAND_SECONDS = 0.35;
export const HE_LINGER_SECONDS = 0.65;

/** How long the flash's wash takes to expand and fade — the same argument as the HE's. */
export const FLASH_EXPAND_SECONDS = 0.4;

/** How long the smoke / molotov body fades before expiry — §6.2. */
export const AREA_FADE_SECONDS = 2.0;

/**
 * How long a smoke takes to fill, and a fire to spread, in **match** seconds from the detonation.
 *
 * Modelled rather than read: `docs/PARSER.md` §23 measured the recording carrying neither. A fire's
 * own entity reports one position that never moves across all 114 of them, and a settled cloud's
 * position is identical for its whole life — so growth is a rule this product states, and stating it
 * is what makes the plate look like a match rather than a diagram.
 */
export const SMOKE_FILL_SECONDS = 1.0;
export const FIRE_SPREAD_SECONDS = 1.5;

/** What an area is drawn at on the tick it detonates — a canister, not a cloud. */
export const AREA_START_EXTENT = 0.25;

/**
 * What each is drawn at as it ends. A smoke thins more than it shrinks, so it settles near its full
 * size and goes on alpha; a fire genuinely dies back, and a patch of flame half the size it was is
 * the reading a player acts on.
 */
export const SMOKE_END_EXTENT = 0.85;
export const FIRE_END_EXTENT = 0.45;

/** What a smoke cloud is drawn at while it is not fading — §6.2. */
export const SMOKE_AREA_ALPHA = 0.3;

/** And a fire area, which is thinner because it is read through — §6.2. */
export const FIRE_AREA_ALPHA = 0.25;

/** Pulse frequency of a decoy mark, in Hz of match time — §6.2. */
export const DECOY_PULSE_HZ = 2;

// ── grenade visual phase ────────────────────────────────────────────────────

/**
 * What phase a grenade is in, written into a caller-owned scratch to avoid per-frame allocation.
 * Each phase carries enough state for the draw functions in `features/radar/helpers/grenades.ts`.
 *
 * - `'flight'`  — projectile in the air, draw trajectory
 * - `'expand'`  — the HE ring or the flash's wash reaching its radius, `progress` goes 0→1
 * - `'active'`  — a smoke or fire body, or a decoy, standing on the ground: `alpha` is its opacity,
 *                 `extent` how much of its radius it has reached, `remainingSeconds` what it states
 * - `'linger'`  — the HE ring fading where it stopped, which is the half a reader actually catches
 * - `null`      — not visible at this tick
 */
export type GrenadePhase = 'flight' | 'expand' | 'active' | 'linger';

export interface GrenadeVisualScratch {
  phase: GrenadePhase | null;
  /** [0..1] expansion progress for the HE ring and the flash's wash. */
  progress: number;
  /** Current opacity for a smoke or fire body. */
  alpha: number;
  /**
   * [0..1] of its full radius that a body has reached — up over its fill, held, and back down as it
   * ends. It is what makes a smoke arrive rather than appear.
   */
  extent: number;
  /** Whole seconds of life a body has left, which it states in its own centre. */
  remainingSeconds: number;
  /** [0..1] decoy pulse phase — fed to a sine curve by the draw. */
  pulsePhase: number;
}

/** Allocate once, reuse every frame. */
export function createVisualScratch(): GrenadeVisualScratch {
  return { phase: null, progress: 0, alpha: 0, extent: 0, remainingSeconds: 0, pulsePhase: 0 };
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
    // Its own span rather than the whole life's, so `progress` means the same thing in both arms —
    // how far through *this* phase — and the ring has something to fade on.
    out.phase = 'linger';
    out.progress = (elapsed - expandSeconds) / (totalSeconds - expandSeconds);
  }
}

/**
 * An area standing on the ground until its expiry — a smoke body or a fire, which share this
 * arithmetic and differ in the four numbers the caller passes: what they are drawn at, how long they
 * take to reach their extent, and what extent they end at.
 *
 * It **arrives** rather than appearing. `extent` climbs from [`AREA_START_EXTENT`] over `fillSeconds`
 * and falls to `endExtent` across the last [`AREA_FADE_SECONDS`], so a cloud fills from its canister
 * and a fire spreads along the floor. Every step of that is a function of the tick, so scrubbing
 * backwards through a smoke unfills it.
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
  fillSeconds: number,
  endExtent: number,
): void {
  if (grenade.expiryTick === null || grenade.detonationTick === null) return;
  if (tick > grenade.expiryTick) return;

  const remainingSeconds = ((grenade.expiryTick as number) - (tick as number)) / tickRate;
  const elapsed = ((tick as number) - (grenade.detonationTick as number)) / tickRate;

  // A body shorter-lived than its own fill still arrives rather than appearing, so the fill is
  // clamped to the life rather than the life being assumed longer than the fill.
  const filling = Math.min(1, fillSeconds > 0 ? elapsed / fillSeconds : 1);
  const grown = AREA_START_EXTENT + (1 - AREA_START_EXTENT) * filling;
  const ending = Math.min(1, Math.max(0, remainingSeconds / AREA_FADE_SECONDS));

  out.phase = 'active';
  out.remainingSeconds = Math.max(0, Math.ceil(remainingSeconds));
  out.extent = Math.min(grown, endExtent + (1 - endExtent) * ending);
  out.alpha = remainingSeconds <= AREA_FADE_SECONDS ? peakAlpha * ending : peakAlpha;
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
  out.extent = 1;
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
  out.extent = 0;
  out.remainingSeconds = 0;
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
      writeArea(
        out,
        grenade,
        tick,
        tickRate,
        SMOKE_AREA_ALPHA,
        SMOKE_FILL_SECONDS,
        SMOKE_END_EXTENT,
      );
      break;
    case 'molotov':
    case 'incgrenade':
      writeArea(
        out,
        grenade,
        tick,
        tickRate,
        FIRE_AREA_ALPHA,
        FIRE_SPREAD_SECONDS,
        FIRE_END_EXTENT,
      );
      break;
    case 'decoy':
      writeDecoy(out, grenade, tick, elapsed);
      break;
  }

  return out;
}
