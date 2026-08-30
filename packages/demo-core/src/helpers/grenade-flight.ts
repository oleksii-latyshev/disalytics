import { asTick, type Grenade, type Tick } from '../schema';

// Where a grenade is while it is still in the air, which is a different question from what it
// draws once it lands — `grenade-state.ts` is that half, and it reads `isInFlight` from here.
// The trajectory these functions bound is the projectile's whole life rather than its flight:
// `docs/PARSER.md` §20 has the per-type spread, and it is why the clip count exists at all.

// Ordering slack past the projectile's last sample, matching `DETONATION_SLACK_TICKS` in
// `crates/demo-parser/src/grenades.rs`: the entity leaves the world before the event that says why.
const FLIGHT_SLACK_SECONDS = 1;

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
