import { lastFrame } from './helpers/selectors';
import type { TickTrack } from './schema';

/**
 * `AGENTS.md` §8. Deliberately a plain mutable object rather than a store: `frame` is written once
 * per animation frame, and any reactive container would turn each of those writes into a render.
 */
export interface Clock {
  /**
   * A position on the sample axis, fractional between two samples. It is not a `Frame` — a `Frame`
   * indexes one sample, this sits between two of them.
   */
  frame: number;
  isPlaying: boolean;
  /** A multiplier on real time. At 1 the match runs at the speed it was played at. */
  speed: number;
  /**
   * The rate a held arrow key is scrubbing at, signed by its direction, or `null` when nothing is
   * held — `docs/DESIGN.md` §9.1. It is separate from `speed` rather than written over it because
   * it is temporary: the speed control shows the rate the reader *chose*, and a hold must not look
   * like a choice (§7.2).
   */
  scrub: number | null;
}

export function createClock(frame = 0): Clock {
  return { frame, isPlaying: false, speed: 1, scrub: null };
}

/**
 * Moves the clock by the real time that has passed. Playback stops on the last sample rather than
 * running past the end of the track; the start is a floor and not a stop, because only a held arrow
 * key reaches it and releasing that key is what ends the scrub.
 */
export function advanceClock(clock: Clock, track: TickTrack, elapsedMs: number): void {
  if (!clock.isPlaying) return;

  const end = lastFrame(track);
  const rate = clock.scrub ?? clock.speed;
  const next = clock.frame + (elapsedMs / 1000) * track.sampleHz * rate;

  if (next >= end) {
    clock.frame = end;
    clock.isPlaying = false;
    return;
  }

  clock.frame = next < 0 ? 0 : next;
}
