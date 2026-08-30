import { describe, expect, it } from 'vitest';
import { trajectoryClipCount } from '../helpers/grenade-flight';
import { asTick } from '../schema';
import { newEvents, withGrenade } from './helpers';

const TICK_RATE = 64;

function firstGrenade(events: { grenades: readonly import('../schema').Grenade[] }) {
  const g = events.grenades[0];
  if (g === undefined) throw new Error('test setup: expected at least one grenade');
  return g;
}

describe('trajectoryClipCount', () => {
  it('returns 0 before throw', () => {
    const events = withGrenade(newEvents(), {
      type: 'hegrenade',
      throwTick: asTick(100),
      detonationTick: asTick(200),
      detonationPosition: { x: 0, y: 0, z: 0 },
      trajectory: {
        sampleHz: 16,
        firstTick: asTick(100),
        sampleCount: 10,
        x: new Float32Array(10),
        y: new Float32Array(10),
        z: new Float32Array(10),
      },
    });
    expect(trajectoryClipCount(firstGrenade(events), asTick(50), TICK_RATE)).toBe(0);
  });

  it('returns full count after detonation', () => {
    const events = withGrenade(newEvents(), {
      type: 'hegrenade',
      throwTick: asTick(100),
      detonationTick: asTick(200),
      detonationPosition: { x: 0, y: 0, z: 0 },
      trajectory: {
        sampleHz: 16,
        firstTick: asTick(100),
        sampleCount: 10,
        x: new Float32Array(10),
        y: new Float32Array(10),
        z: new Float32Array(10),
      },
    });
    expect(trajectoryClipCount(firstGrenade(events), asTick(250), TICK_RATE)).toBe(10);
  });

  it('clips at mid-flight', () => {
    const events = withGrenade(newEvents(), {
      type: 'hegrenade',
      throwTick: asTick(100),
      detonationTick: asTick(200),
      detonationPosition: { x: 0, y: 0, z: 0 },
      trajectory: {
        sampleHz: 16,
        firstTick: asTick(100),
        sampleCount: 25,
        x: new Float32Array(25),
        y: new Float32Array(25),
        z: new Float32Array(25),
      },
    });
    const clip = trajectoryClipCount(firstGrenade(events), asTick(150), TICK_RATE);
    expect(clip).toBeGreaterThan(0);
    expect(clip).toBeLessThan(25);
  });
});
