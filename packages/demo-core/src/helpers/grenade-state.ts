//! Which grenades are on the plate at a tick, and the engine radii they are drawn at. What each one
//! looks like once it is there is `grenade-visual.ts`.

import { asTick, type Grenade, type GrenadeType, type Tick } from '../schema';
import { flightEndTick, isInFlight } from './grenade-flight';
import { FLASH_EXPAND_SECONDS, HE_EXPAND_SECONDS, HE_LINGER_SECONDS } from './grenade-visual';

// ── CS2 engine constants ────────────────────────────────────────────────────
// Named approximations, same approach as `audibility.ts`. These are not published by Valve; the
// numbers are calibrated against demo playback with developer overlay enabled.

/** Effective radius of a smoke grenade cloud, in world units. */
export const SMOKE_RADIUS_UNITS = 144;

/** Effective radius of a molotov / incendiary fire area, in world units. */
export const MOLOTOV_RADIUS_UNITS = 180;

/** Effective radius of an HE grenade explosion, in world units. */
export const HE_RADIUS_UNITS = 350;

/**
 * How far a flashbang's wash reaches, in world units. Smaller than the range it can blind from on
 * purpose: what the mark says is *a flash went off here*, and who it caught is on the players
 * themselves (§6.1). A world radius rather than a pixel one, so it is the same ground at every zoom.
 */
export const FLASH_RADIUS_UNITS = 120;

/** The total visual lifetime of an HE after detonation. */
const HE_TOTAL_SECONDS = HE_EXPAND_SECONDS + HE_LINGER_SECONDS;

// ── active grenade collection ───────────────────────────────────────────────

/**
 * The longest a grenade stays on the plate after its throw, used to terminate the walk in
 * [`visibleGrenades`]. The fixture's longest throw-to-expiry is 26.7 s (a smoke), so this is a
 * bound with headroom rather than a measurement.
 */
const MAX_VISUAL_SECONDS = 45;

/**
 * The last tick a burst is drawn on. `writeBurst` runs while `elapsed < seconds`, and ticks are
 * whole numbers, so the last one it admits is that bound rounded up and stepped back off it.
 */
function burstEndTick(detonation: Tick, seconds: number, tickRate: number): Tick {
  return asTick((detonation as number) + Math.ceil(seconds * tickRate) - 1);
}

/**
 * The last tick a grenade is on the plate at all — the single definition of a grenade's own life,
 * read by the draw below and by §5.4's feed, which shows a grenade's row for exactly as long as its
 * mark is on the plate. Two rules that agree today is what this exists to avoid.
 *
 * A grenade whose detonation never arrived ends when its flight does (#175): `null` is an ending the
 * demo never recorded, never a grenade still in the air. An area with no expiry is the same case one
 * step later — nothing is drawn for it once it lands, so it ends the tick before its detonation.
 *
 * Exhaustive with no `default`, so a new `GrenadeType` is a compile error rather than a grenade that
 * silently never appears.
 */
export function grenadeEndTick(grenade: Grenade, tickRate: number): Tick {
  const beforeDetonation = asTick((flightEndTick(grenade, tickRate) as number) - 1);
  if (grenade.detonationTick === null) return beforeDetonation;

  switch (grenade.type) {
    case 'hegrenade':
      return burstEndTick(grenade.detonationTick, HE_TOTAL_SECONDS, tickRate);
    case 'flashbang':
      return burstEndTick(grenade.detonationTick, FLASH_EXPAND_SECONDS, tickRate);
    case 'smokegrenade':
    case 'molotov':
    case 'incgrenade':
    case 'decoy':
      return grenade.expiryTick ?? beforeDetonation;
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

    if (tick <= grenadeEndTick(g, tickRate)) out[count++] = i;
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
    case 'flashbang':
      return FLASH_RADIUS_UNITS;
    default:
      return 0;
  }
}
