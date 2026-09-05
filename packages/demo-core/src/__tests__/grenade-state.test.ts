import { describe, expect, it } from 'vitest';
import {
  AREA_FADE_SECONDS,
  createVisualScratch,
  grenadeEndTick,
  grenadeRadiusUnits,
  grenadeVisual,
  HE_EXPAND_SECONDS,
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

describe('grenadeVisual', () => {
  const scratch = createVisualScratch();

  it('returns null before throw', () => {
    const events = withGrenade(newEvents(), {
      type: 'hegrenade',
      throwTick: asTick(100),
      detonationTick: asTick(200),
      detonationPosition: { x: 0, y: 0, z: 0 },
    });
    grenadeVisual(firstGrenade(events), asTick(50), TICK_RATE, scratch);
    expect(scratch.phase).toBeNull();
  });

  it('returns flight between throw and detonation', () => {
    const events = withGrenade(newEvents(), {
      type: 'hegrenade',
      throwTick: asTick(100),
      detonationTick: asTick(200),
      detonationPosition: { x: 0, y: 0, z: 0 },
    });
    grenadeVisual(firstGrenade(events), asTick(150), TICK_RATE, scratch);
    expect(scratch.phase).toBe('flight');
  });

  describe('a grenade whose detonation never arrived', () => {
    // The crate emits `detonationTick: null` whenever it cannot match a detonation event to the
    // projectile. That is an unknown ending, not a grenade that is still in the air (#169).
    const events = withGrenade(newEvents(), {
      type: 'smokegrenade',
      throwTick: asTick(100),
      detonationTick: null,
      detonationPosition: null,
      trajectory: {
        sampleHz: 16,
        firstTick: asTick(100),
        sampleCount: 33, // two seconds of samples at 16 Hz
        x: new Float32Array(33),
        y: new Float32Array(33),
        z: new Float32Array(33),
      },
    });

    it('flies while the projectile is still being sampled', () => {
      grenadeVisual(firstGrenade(events), asTick(150), TICK_RATE, scratch);
      expect(scratch.phase).toBe('flight');
    });

    it('leaves the plate once the trajectory and its slack are past', () => {
      grenadeVisual(firstGrenade(events), asTick(300), TICK_RATE, scratch);
      expect(scratch.phase).toBeNull();
    });

    it('is gone a whole round later rather than drawn for the rest of the match', () => {
      grenadeVisual(firstGrenade(events), asTick(100 + 115 * TICK_RATE), TICK_RATE, scratch);
      expect(scratch.phase).toBeNull();
    });
  });

  describe('HE grenade', () => {
    const events = withGrenade(newEvents(), {
      type: 'hegrenade',
      throwTick: asTick(0),
      detonationTick: asTick(100),
      detonationPosition: { x: 0, y: 0, z: 0 },
    });

    it('shows expanding ring right after detonation', () => {
      // 0.1s after detonation = 6.4 ticks
      grenadeVisual(firstGrenade(events), asTick(106), TICK_RATE, scratch);
      expect(scratch.phase).toBe('expand');
      expect(scratch.progress).toBeCloseTo(0.1 / HE_EXPAND_SECONDS, 1);
    });

    it('shows linger after expansion', () => {
      // HE_EXPAND_SECONDS = 0.2s = 12.8 ticks, so at tick 113 = 0.203s
      grenadeVisual(firstGrenade(events), asTick(114), TICK_RATE, scratch);
      expect(scratch.phase).toBe('linger');
    });

    it('is null after linger period', () => {
      // HE_EXPAND_SECONDS + HE_LINGER_SECONDS = 1.2s = 76.8 ticks
      grenadeVisual(firstGrenade(events), asTick(200), TICK_RATE, scratch);
      expect(scratch.phase).toBeNull();
    });
  });

  describe('flashbang', () => {
    const events = withGrenade(newEvents(), {
      type: 'flashbang',
      throwTick: asTick(0),
      detonationTick: asTick(100),
      detonationPosition: { x: 0, y: 0, z: 0 },
    });

    it('shows expanding mark briefly after detonation', () => {
      grenadeVisual(firstGrenade(events), asTick(104), TICK_RATE, scratch);
      expect(scratch.phase).toBe('expand');
      expect(scratch.progress).toBeGreaterThan(0);
      expect(scratch.progress).toBeLessThan(1);
    });

    it('is null after expand period', () => {
      // FLASH_EXPAND_SECONDS = 0.15s = 9.6 ticks
      grenadeVisual(firstGrenade(events), asTick(115), TICK_RATE, scratch);
      expect(scratch.phase).toBeNull();
    });
  });

  describe('smoke grenade', () => {
    // 18s smoke: detonation at tick 100, expiry at tick 100 + 18*64 = 1252
    const events = smokeAt(0, 100, 1252);

    it('shows active disc at full alpha during lifetime', () => {
      // 5 seconds after detonation
      grenadeVisual(firstGrenade(events), asTick(420), TICK_RATE, scratch);
      expect(scratch.phase).toBe('active');
      expect(scratch.alpha).toBeCloseTo(0.3);
      expect(scratch.remaining).toBeGreaterThan(0);
      expect(scratch.remaining).toBeLessThan(1);
    });

    it('fades alpha in the last 2 seconds', () => {
      // 1 second before expiry (remaining = 1s out of AREA_FADE_SECONDS=2s)
      const tickBeforeEnd = 1252 - TICK_RATE; // 1s before expiry
      grenadeVisual(firstGrenade(events), asTick(tickBeforeEnd), TICK_RATE, scratch);
      expect(scratch.phase).toBe('active');
      expect(scratch.alpha).toBeCloseTo(0.3 * (1 / AREA_FADE_SECONDS), 1);
    });

    it('is null after expiry', () => {
      grenadeVisual(firstGrenade(events), asTick(1253), TICK_RATE, scratch);
      expect(scratch.phase).toBeNull();
    });
  });

  describe('molotov', () => {
    const events = withGrenade(newEvents(), {
      type: 'molotov',
      throwTick: asTick(0),
      detonationTick: asTick(100),
      detonationPosition: { x: 0, y: 0, z: 0 },
      expiryTick: asTick(580), // ~7.5s
    });

    it('shows active area at 0.25 alpha', () => {
      grenadeVisual(firstGrenade(events), asTick(200), TICK_RATE, scratch);
      expect(scratch.phase).toBe('active');
      expect(scratch.alpha).toBeCloseTo(0.25);
    });

    it('fades in the last 2 seconds', () => {
      // 0.5s before expiry
      const tickBeforeEnd = 580 - TICK_RATE / 2;
      grenadeVisual(firstGrenade(events), asTick(tickBeforeEnd), TICK_RATE, scratch);
      expect(scratch.phase).toBe('active');
      expect(scratch.alpha).toBeLessThan(0.25);
      expect(scratch.alpha).toBeGreaterThan(0);
    });
  });

  describe('decoy', () => {
    const events = withGrenade(newEvents(), {
      type: 'decoy',
      throwTick: asTick(0),
      detonationTick: asTick(100),
      detonationPosition: { x: 0, y: 0, z: 0 },
      expiryTick: asTick(1380), // ~20s
    });

    it('shows active with pulsePhase cycling', () => {
      grenadeVisual(firstGrenade(events), asTick(200), TICK_RATE, scratch);
      expect(scratch.phase).toBe('active');
      expect(scratch.pulsePhase).toBeGreaterThanOrEqual(0);
      expect(scratch.pulsePhase).toBeLessThan(1);
    });
  });
});

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

    // The bound is 1.2 s at 64 ticks, which is 76.8 ticks and so lands mid-tick.
    expect(end).toBe(276);

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
    expect(grenadeRadiusUnits('flashbang')).toBe(0);
    expect(grenadeRadiusUnits('decoy')).toBe(0);
  });
});
