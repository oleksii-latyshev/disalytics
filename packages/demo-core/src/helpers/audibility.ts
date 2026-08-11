import { FLAG_WALKING, type TickTrack } from '../schema';
import { sampleAt } from './selectors';

/**
 * How far a running player's footsteps carry, in world units. The engine's falloff is not linear and
 * not published; this is the distance the sound is still useful at, which is what a review needs.
 */
export const AUDIBLE_MAX_UNITS = 1100;

/** A player at the game's maximum running speed. Knife out and unslowed, in units per second. */
export const RUNNING_SPEED_UNITS = 250;

/**
 * Below this, a player is moving but not stepping — settling off a ledge, easing round a corner —
 * and makes no footstep at all.
 */
export const SILENT_SPEED_UNITS = 40;

/**
 * The radius a player can currently be heard from. Zero means silent, and silence is the honest
 * answer for a walking player: holding shift is how the game asks not to be heard.
 *
 * The model is deliberately simple and deliberately here rather than in a component — it is a rule
 * about the game, and `AGENTS.md` §2 rule 11 keeps those out of the view layer. It is an
 * approximation of an engine falloff nobody outside Valve has the curve for.
 */
export function audibleRadiusUnits(speedUnitsPerSecond: number, isWalking: boolean): number {
  if (isWalking || speedUnitsPerSecond <= SILENT_SPEED_UNITS) return 0;

  const carried = Math.min(speedUnitsPerSecond / RUNNING_SPEED_UNITS, 1);

  return carried * AUDIBLE_MAX_UNITS;
}

/** The same answer read straight out of a track, for a caller that already has the sample index. */
export function audibleRadiusAt(track: TickTrack, sample: number): number {
  return audibleRadiusUnits(
    sampleAt(track.speed, sample),
    (sampleAt(track.flags, sample) & FLAG_WALKING) !== 0,
  );
}
