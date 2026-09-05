import { describe, expect, it } from 'vitest';
import {
  FLASH_RADIUS_UNITS,
  grenadeEndTick,
  grenadeRadiusUnits,
  HE_RADIUS_UNITS,
  MOLOTOV_RADIUS_UNITS,
  SMOKE_RADIUS_UNITS,
  visibleGrenades,
} from '../helpers/grenade-state';
import { asTick } from '../schema';
import { newEvents, withGrenade } from './helpers';

const TICK_RATE = 64;

function firstGrenade(events: { grenades: readonly import('../schema').Grenade[] }) {
  const g = events.grenades[0];
  if (g === undefined) throw new Error('test setup: expected at least one grenade');
  return g;
}

/** Convenience: creates a grenade visible in the [throw..expiry] window. */
function smokeAt(throwTick: number, detonationTick: number, expiryTick: number) {
  return withGrenade(newEvents(), {
    type: 'smokegrenade',
    throwTick: asTick(throwTick),
    detonationTick: asTick(detonationTick),
    detonationPosition: { x: 0, y: 0, z: 0 },
    expiryTick: asTick(expiryTick),
  });
}

describe('grenadeEndTick', () => {
  it('ends an area at its expiry', () => {
    const events = smokeAt(100, 200, 1_400);
    expect(grenadeEndTick(firstGrenade(events), TICK_RATE)).toBe(1_400);
  });

  it('ends a burst on the last tick the draw still admits', () => {
    const events = withGrenade(newEvents(), {
      type: 'hegrenade',
      throwTick: asTick(100),
      detonationTick: asTick(200),
      detonationPosition: { x: 0, y: 0, z: 0 },
    });
    const he = firstGrenade(events);
    const end = grenadeEndTick(he, TICK_RATE);

    // The bound is 1.0 s at 64 ticks — the ring's 0.35 s of opening and its 0.65 s of fading — and
    // this is the last tick still inside it rather than the first one outside.
    expect(end).toBe(263);

    const out = new Int32Array(1);
    expect(visibleGrenades([he], end, TICK_RATE, out)).toBe(1);
    expect(visibleGrenades([he], asTick((end as number) + 1), TICK_RATE, out)).toBe(0);
  });

  it('ends a grenade with no recorded ending when its flight does', () => {
    const events = withGrenade(newEvents(), {
      type: 'smokegrenade',
      throwTick: asTick(100),
      detonationTick: null,
    });
    const grenade = firstGrenade(events);
    const end = grenadeEndTick(grenade, TICK_RATE);

    const out = new Int32Array(1);
    expect(visibleGrenades([grenade], end, TICK_RATE, out)).toBe(1);
    expect(visibleGrenades([grenade], asTick((end as number) + 1), TICK_RATE, out)).toBe(0);
  });

  it('ends an area with no expiry before its own detonation', () => {
    const events = withGrenade(newEvents(), {
      type: 'smokegrenade',
      throwTick: asTick(100),
      detonationTick: asTick(200),
      detonationPosition: { x: 0, y: 0, z: 0 },
      expiryTick: null,
    });
    expect(grenadeEndTick(firstGrenade(events), TICK_RATE)).toBe(199);
  });
});

describe('visibleGrenades', () => {
  it('finds an in-flight grenade', () => {
    const events = withGrenade(newEvents(), {
      type: 'hegrenade',
      throwTick: asTick(100),
      detonationTick: asTick(200),
      detonationPosition: { x: 0, y: 0, z: 0 },
    });
    const out = new Int32Array(16);
    const count = visibleGrenades(events.grenades, asTick(150), TICK_RATE, out);
    expect(count).toBe(1);
    expect(out[0]).toBe(0);
  });

  it('finds an active smoke', () => {
    const events = smokeAt(0, 100, 1252);
    const out = new Int32Array(16);
    const count = visibleGrenades(events.grenades, asTick(500), TICK_RATE, out);
    expect(count).toBe(1);
  });

  it('skips expired grenades', () => {
    const events = smokeAt(0, 100, 1252);
    const out = new Int32Array(16);
    const count = visibleGrenades(events.grenades, asTick(1253), TICK_RATE, out);
    expect(count).toBe(0);
  });

  it('finds multiple grenades', () => {
    let events = withGrenade(newEvents(), {
      type: 'smokegrenade',
      throwTick: asTick(100),
      detonationTick: asTick(200),
      detonationPosition: { x: 0, y: 0, z: 0 },
      expiryTick: asTick(2000),
    });
    events = withGrenade(events, {
      type: 'hegrenade',
      throwTick: asTick(300),
      detonationTick: asTick(400),
      detonationPosition: { x: 100, y: 100, z: 0 },
    });
    const out = new Int32Array(16);
    const count = visibleGrenades(events.grenades, asTick(405), TICK_RATE, out);
    expect(count).toBe(2);
  });

  it('collects a grenade with no detonation while it is still being sampled', () => {
    const events = withGrenade(newEvents(), {
      type: 'smokegrenade',
      throwTick: asTick(100),
      detonationTick: null,
      detonationPosition: null,
    });
    const out = new Int32Array(16);
    const count = visibleGrenades(events.grenades, asTick(150), TICK_RATE, out);
    expect(count).toBe(1);
  });

  it('drops a grenade with no detonation once its flight is over', () => {
    const events = withGrenade(newEvents(), {
      type: 'smokegrenade',
      throwTick: asTick(100),
      detonationTick: null,
      detonationPosition: null,
    });
    const out = new Int32Array(16);
    expect(visibleGrenades(events.grenades, asTick(400), TICK_RATE, out)).toBe(0);
    expect(visibleGrenades(events.grenades, asTick(100_000), TICK_RATE, out)).toBe(0);
  });

  it('walks the window rather than the match', () => {
    let events = newEvents();
    for (let i = 0; i < 400; i++) {
      events = withGrenade(events, {
        type: 'hegrenade',
        throwTick: asTick(i * 64),
        detonationTick: asTick(i * 64 + 100),
        detonationPosition: { x: 0, y: 0, z: 0 },
      });
    }

    // One grenade per second for 400 s, sampled at the end: a walk bounded by the window reads a
    // few dozen entries, and a walk bounded by the match reads all 400.
    let reads = 0;
    const counted = new Proxy(events.grenades, {
      get(target, key, receiver) {
        if (typeof key === 'string' && /^\d+$/.test(key)) reads++;
        return Reflect.get(target, key, receiver);
      },
    });

    const out = new Int32Array(512);
    visibleGrenades(counted, asTick(399 * 64), TICK_RATE, out);

    expect(reads).toBeLessThan(100);
  });
});

describe('grenadeRadiusUnits', () => {
  it('returns correct radius for each type', () => {
    expect(grenadeRadiusUnits('smokegrenade')).toBe(SMOKE_RADIUS_UNITS);
    expect(grenadeRadiusUnits('molotov')).toBe(MOLOTOV_RADIUS_UNITS);
    expect(grenadeRadiusUnits('incgrenade')).toBe(MOLOTOV_RADIUS_UNITS);
    expect(grenadeRadiusUnits('hegrenade')).toBe(HE_RADIUS_UNITS);
    // A flashbang has a radius since its wash stopped being a flat 12px and started following the
    // zoom like every other mark. A decoy still has none: its pulse is a mark, not an area.
    expect(grenadeRadiusUnits('flashbang')).toBe(FLASH_RADIUS_UNITS);
    expect(grenadeRadiusUnits('decoy')).toBe(0);
  });
});
