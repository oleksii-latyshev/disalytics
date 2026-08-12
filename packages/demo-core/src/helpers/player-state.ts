import {
  FLAG_DEFUSING,
  FLAG_PLANTING,
  type ParsedDemo,
  type PlayerSlot,
  type Tick,
  type TickTrack,
} from '../schema';
import { sampleAt, secondsAtFrame, tickAtFrame } from './selectors';

/** How long a hit stays visible on the token, in **match** seconds — `docs/DESIGN.md` §7. */
export const DAMAGE_FLASH_SECONDS = 0.25;

/**
 * The longest flashbang the game produces, and so how far back a blind lookup has to walk. A blind
 * older than this cannot still be running whatever its own duration says.
 */
const BLIND_LOOKBACK_SECONDS = 6;

export const PLANT_SECONDS = 3.2;
export const DEFUSE_SECONDS = 10;
export const DEFUSE_WITH_KIT_SECONDS = 5;

/**
 * The last event at or before `tick`, by binary search over a tick-sorted array — `-1` when every
 * event is still ahead. Events are plain objects in sorted arrays (`AGENTS.md` §2 rule 3), and this
 * is the lookup that makes them cheap to read from a draw.
 */
export function lastIndexAtOrBefore(ticks: readonly { tick: Tick }[], tick: Tick): number {
  let low = 0;
  let high = ticks.length - 1;
  let found = -1;

  while (low <= high) {
    const middle = (low + high) >> 1;
    const candidate = ticks[middle];

    if (candidate === undefined) {
      throw new RangeError(`event ${middle} is outside an array of ${ticks.length}`);
    }

    if (candidate.tick <= tick) {
      found = middle;
      low = middle + 1;
      continue;
    }

    high = middle - 1;
  }

  return found;
}

/**
 * How brightly each slot is still flashing from a hit — 1 at the moment of the damage, 0 once
 * `DAMAGE_FLASH_SECONDS` of match time have passed. Written into `out` rather than returned, because
 * this runs inside a draw.
 *
 * It is a function of the clock's position and never of history, so scrubbing backwards through a
 * hit shows the flash again.
 */
export function damageFlashBySlot(demo: ParsedDemo, frame: number, out: Float32Array): void {
  out.fill(0);

  const { track, events } = demo;
  const now = secondsAtFrame(track, frame);

  for (
    let index = lastIndexAtOrBefore(events.damage, tickAtFrame(track, frame));
    index >= 0;
    index--
  ) {
    const event = events.damage[index];
    if (event === undefined) break;

    const age = now - event.tick / track.tickRate;
    if (age > DAMAGE_FLASH_SECONDS) break;

    const flash = age <= 0 ? 1 : 1 - age / DAMAGE_FLASH_SECONDS;
    if (flash > (out[event.victim] ?? 0)) out[event.victim] = flash;
  }
}

/**
 * Which slots are still blinded, `1` for blinded. A flashed player is not looking anywhere, so the
 * plate drops their facing needle rather than claiming a direction they cannot see in.
 */
export function blindedBySlot(demo: ParsedDemo, frame: number, out: Uint8Array): void {
  out.fill(0);

  const { track, events } = demo;
  const now = secondsAtFrame(track, frame);

  for (
    let index = lastIndexAtOrBefore(events.blinds, tickAtFrame(track, frame));
    index >= 0;
    index--
  ) {
    const event = events.blinds[index];
    if (event === undefined) break;

    const age = now - event.tick / track.tickRate;
    if (age > BLIND_LOOKBACK_SECONDS) break;
    if (age < event.durationSeconds) out[event.victim] = 1;
  }
}

/** The sample a fractional clock position reads its discrete columns from. */
function sampleFor(track: TickTrack, frame: number, slot: PlayerSlot): number {
  const index = Math.min(Math.max(Math.floor(frame), 0), Math.max(track.frameCount - 1, 0));

  return index * track.slotCount + slot;
}

function defuseTakesSeconds(demo: ParsedDemo, tick: Tick): number {
  const { defuses } = demo.events;
  let seconds = DEFUSE_SECONDS;

  for (const defuse of defuses) {
    if (defuse.startTick > tick) break;
    seconds = defuse.hasKit ? DEFUSE_WITH_KIT_SECONDS : DEFUSE_SECONDS;
  }

  return seconds;
}

/**
 * How far into a plant or a defuse a slot is at `frame`, in `[0, 1]`, or `null` when it is doing
 * neither. The start is found by walking back over the samples the flag has held for, so the arc is
 * a function of the clock's position like everything else on the plate.
 */
export function bombProgressAt(demo: ParsedDemo, frame: number, slot: PlayerSlot): number | null {
  const { track } = demo;
  if (track.frameCount === 0) return null;

  const sample = sampleFor(track, frame, slot);
  const flags = sampleAt(track.flags, sample);
  const action = flags & (FLAG_PLANTING | FLAG_DEFUSING);
  if (action === 0) return null;

  let started = Math.floor(sample / track.slotCount);
  while (
    started > 0 &&
    (sampleAt(track.flags, (started - 1) * track.slotCount + slot) & action) !== 0
  ) {
    started--;
  }

  const takes =
    (flags & FLAG_PLANTING) !== 0
      ? PLANT_SECONDS
      : defuseTakesSeconds(demo, tickAtFrame(track, frame));
  const elapsed = secondsAtFrame(track, frame) - secondsAtFrame(track, started);

  return Math.min(Math.max(elapsed / takes, 0), 1);
}
