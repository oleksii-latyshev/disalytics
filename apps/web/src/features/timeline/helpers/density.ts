import {
  frameForTick,
  lastFrame,
  type ParsedDemo,
  sampleAt,
  secondsAtFrame,
  type Tick,
  type TickTrack,
} from '@disa/demo-core';

/**
 * How loud each second of the match is: kill and damage events counted into one bucket per second
 * and scaled against the loudest second, so a trace drawn from it is always full height somewhere.
 */
export interface EventDensity {
  readonly perSecond: Float32Array;
  readonly durationSeconds: number;
}

function countInto(
  buckets: Float32Array,
  track: TickTrack,
  events: readonly { readonly tick: Tick }[],
): void {
  for (const event of events) {
    const second = Math.floor(secondsAtFrame(track, frameForTick(track, event.tick)));
    const bucket = Math.min(second, buckets.length - 1);

    buckets[bucket] = sampleAt(buckets, bucket) + 1;
  }
}

function peakOf(buckets: Float32Array): number {
  let peak = 0;

  for (let index = 0; index < buckets.length; index++) {
    const value = sampleAt(buckets, index);
    if (value > peak) peak = value;
  }

  return peak;
}

/** Derived once per demo: the arrays are walked here so that nothing has to walk them in a draw. */
export function eventDensity(demo: ParsedDemo): EventDensity {
  const { track, events } = demo;
  const durationSeconds = secondsAtFrame(track, lastFrame(track));
  const bucketCount = Math.ceil(durationSeconds);

  if (bucketCount === 0) return { perSecond: new Float32Array(0), durationSeconds: 0 };

  const perSecond = new Float32Array(bucketCount);
  countInto(perSecond, track, events.kills);
  countInto(perSecond, track, events.damage);

  const peak = peakOf(perSecond);
  if (peak === 0) return { perSecond, durationSeconds };

  for (let index = 0; index < perSecond.length; index++) {
    perSecond[index] = sampleAt(perSecond, index) / peak;
  }

  return { perSecond, durationSeconds };
}
