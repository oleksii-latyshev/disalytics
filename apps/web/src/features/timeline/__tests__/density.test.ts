import { describe, expect, it } from 'vitest';
import { eventDensity } from '../helpers/density';
import { newDamage, newDemo, newKill, TICK_RATE } from './helpers';

/** 2001 samples at 16 Hz is 125 seconds of match, which is 125 buckets. */
const FRAME_COUNT = 2001;

function secondsToTick(seconds: number): number {
  return seconds * TICK_RATE;
}

describe('eventDensity', () => {
  it('counts kills and damage into the second they happen in', () => {
    const { perSecond } = eventDensity(
      newDemo(FRAME_COUNT, {
        kills: [newKill(secondsToTick(4))],
        damage: [newDamage(secondsToTick(4)), newDamage(secondsToTick(4) + 8)],
      }),
    );

    expect(perSecond[3]).toBe(0);
    expect(perSecond[4]).toBe(1);
    expect(perSecond[5]).toBe(0);
  });

  it('scales every second against the loudest one', () => {
    const { perSecond } = eventDensity(
      newDemo(FRAME_COUNT, {
        kills: [newKill(secondsToTick(10))],
        damage: [
          newDamage(secondsToTick(20)),
          newDamage(secondsToTick(20)),
          newDamage(secondsToTick(20)),
        ],
      }),
    );

    expect(perSecond[10]).toBeCloseTo(1 / 3);
    expect(perSecond[20]).toBe(1);
  });

  it('measures the match rather than the events', () => {
    const density = eventDensity(newDemo(FRAME_COUNT));

    expect(density.durationSeconds).toBe(125);
    expect(density.perSecond).toHaveLength(125);
  });

  it('leaves a match with no events flat', () => {
    const { perSecond } = eventDensity(newDemo(FRAME_COUNT, { kills: [] }));

    expect(Array.from(perSecond).every((value) => value === 0)).toBe(true);
  });

  it('counts an event past the last sample into the final second', () => {
    const { perSecond } = eventDensity(
      newDemo(FRAME_COUNT, { kills: [newKill(secondsToTick(9000))] }),
    );

    expect(perSecond[124]).toBe(1);
  });

  it('has nothing to measure against a track with no samples', () => {
    const density = eventDensity(newDemo(0, { kills: [newKill(0)] }));

    expect(density.durationSeconds).toBe(0);
    expect(density.perSecond).toHaveLength(0);
  });
});
