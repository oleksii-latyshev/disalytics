import {
  FLAG_DEFUSING,
  FLAG_PLANTING,
  type ParsedDemo,
  type PlayerSlot,
  type Tick,
  type TickTrack,
} from '../schema';
import { lastIndexAtOrBefore, sampleAt, secondsAtFrame, tickAtFrame } from './selectors';

/** How long a hit stays visible on the token, in **match** seconds — `docs/DESIGN.md` §7. */
export const DAMAGE_FLASH_SECONDS = 0.25;

/**
 * The longest flashbang the game produces, and so how far back a blind lookup has to walk. A blind
 * older than this cannot still be running whatever its own duration says.
 */
const BLIND_LOOKBACK_SECONDS = 6;

/** How long a token takes to settle into a body, in **match** seconds — `docs/DESIGN.md` §6.1. */
export const DEATH_SHRINK_SECONDS = 0.2;

/**
 * How long a shot stays on the plate after the trigger went, in **match** seconds —
 * `docs/DESIGN.md` §6.1. Short enough that a burst reads as a burst rather than as one continuous
 * mark, and long enough to survive a frame at 4×.
 */
export const GUNFIRE_TRACER_SECONDS = 0.15;

export const PLANT_SECONDS = 3.2;
export const DEFUSE_SECONDS = 10;
export const DEFUSE_WITH_KIT_SECONDS = 5;

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
 * Which shots are still on the plate at `frame`, most recent first. Writes their indices into
 * `outIndex` and how much of each one's life is left into `outLife` — 1 on the tick the trigger
 * went, 0 once `GUNFIRE_TRACER_SECONDS` of match time have passed — and returns how many it wrote.
 *
 * Two buffers rather than a returned list for the reason `damageFlashBySlot` writes into the
 * caller's: this runs inside a draw. The caller sizes both once per demo, and a shot past the end
 * of them is dropped rather than growing them.
 *
 * Per shot rather than per slot, because a tracer carries the angle *that* trigger pull was made
 * at: a burst whose aim walked is several rays, and collapsing it to the brightest would draw the
 * last one's direction over all of them.
 *
 * A function of the clock's position and never of history, so scrubbing backwards through a burst
 * plays it again — `docs/DESIGN.md` §8's test. `MatchEvents.shots` counts trigger pulls with a gun,
 * so a grenade throw and a knife swing leave nothing here (`docs/PARSER.md` §18).
 */
export function visibleShots(
  demo: ParsedDemo,
  frame: number,
  outIndex: Int32Array,
  outLife: Float32Array,
): number {
  const { track, events } = demo;
  const now = secondsAtFrame(track, frame);
  let count = 0;

  for (
    let index = lastIndexAtOrBefore(events.shots, tickAtFrame(track, frame));
    index >= 0;
    index--
  ) {
    const event = events.shots[index];
    if (event === undefined) break;

    const age = now - event.tick / track.tickRate;
    if (age > GUNFIRE_TRACER_SECONDS) break;
    if (count >= outIndex.length) break;

    outIndex[count] = index;
    outLife[count] = age <= 0 ? 1 : 1 - age / GUNFIRE_TRACER_SECONDS;
    count++;
  }

  return count;
}

/**
 * How much of each slot's flash is still to run — 1 on the tick of the blind, 0 once the event's
 * own `durationSeconds` are spent. A flashed player is not looking anywhere, so the plate drops
 * their facing needle rather than claiming a direction they cannot see in, and covers the token
 * with what is left of the countdown.
 */
export function blindRemainingBySlot(demo: ParsedDemo, frame: number, out: Float32Array): void {
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
    if (age >= event.durationSeconds) continue;

    const remaining = 1 - Math.max(age, 0) / event.durationSeconds;
    if (remaining > (out[event.victim] ?? 0)) out[event.victim] = remaining;
  }
}

/**
 * How far each slot is through the shrink that turns a token into a body — 0 on the tick of the
 * kill, 1 once `DEATH_SHRINK_SECONDS` of match time have passed. A slot with no kill inside that
 * window reads 1, so a body lying there since the start of the round is already settled and a slot
 * that never died carries a value the caller has no reason to read: it asks only for slots it
 * already knows to be dead.
 */
export function deathProgressBySlot(demo: ParsedDemo, frame: number, out: Float32Array): void {
  out.fill(1);

  const { track, events } = demo;
  const now = secondsAtFrame(track, frame);

  for (
    let index = lastIndexAtOrBefore(events.kills, tickAtFrame(track, frame));
    index >= 0;
    index--
  ) {
    const event = events.kills[index];
    if (event === undefined) break;

    const age = now - event.tick / track.tickRate;
    if (age > DEATH_SHRINK_SECONDS) break;

    const progress = age <= 0 ? 0 : age / DEATH_SHRINK_SECONDS;
    if (progress < (out[event.victim] ?? 1)) out[event.victim] = progress;
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
