import { asFrame, type Frame, type ParsedDemo, type Tick, type TickTrack } from '../schema';

/**
 * One value out of a `TickTrack` buffer. `noUncheckedIndexedAccess` types every buffer read as
 * possibly undefined, and the track's invariant — `frameCount * slotCount` values in each buffer —
 * is not something the type system carries, so an out-of-range read is a mis-indexed caller rather
 * than a value to substitute for.
 */
export function sampleAt(buffer: ArrayLike<number>, index: number): number {
  const value = buffer[index];

  if (value === undefined) {
    throw new RangeError(`sample ${index} is outside a buffer of ${buffer.length}`);
  }

  return value;
}

/** The sample covering `tick`, clamped into the track it is read from. */
export function frameForTick(track: TickTrack, tick: Tick): Frame {
  if (track.frameCount === 0) return asFrame(0);

  const frame = Math.round((tick / track.tickRate) * track.sampleHz);

  return asFrame(Math.min(Math.max(frame, 0), track.frameCount - 1));
}

/**
 * The frame the match opens on — the end of the first round's freeze time, which is the first
 * moment the ten players stand where they chose to rather than where they spawned.
 */
export function openingFrame(demo: ParsedDemo): Frame {
  const opening = demo.events.rounds.at(0);

  return opening === undefined ? asFrame(0) : frameForTick(demo.track, opening.freezeTimeEndTick);
}
