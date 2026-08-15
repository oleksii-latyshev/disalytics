import { describe, expect, it } from 'vitest';
import {
  AREA_FADE_SECONDS,
  createVisualScratch,
  grenadeRadiusUnits,
  grenadeVisual,
  HE_EXPAND_SECONDS,
  HE_RADIUS_UNITS,
  MOLOTOV_RADIUS_UNITS,
  SMOKE_RADIUS_UNITS,
  trajectoryClipCount,
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

  it('returns flight when detonation is null', () => {
    const events = withGrenade(newEvents(), {
      type: 'smokegrenade',
      throwTick: asTick(100),
      detonationTick: null,
      detonationPosition: null,
    });
    grenadeVisual(firstGrenade(events), asTick(150), TICK_RATE, scratch);
    expect(scratch.phase).toBe('flight');
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

  it('handles null detonationTick (in flight)', () => {
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
});

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
    expect(trajectoryClipCount(firstGrenade(events), asTick(50))).toBe(0);
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
    expect(trajectoryClipCount(firstGrenade(events), asTick(250))).toBe(10);
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
    const clip = trajectoryClipCount(firstGrenade(events), asTick(150));
    expect(clip).toBeGreaterThan(0);
    expect(clip).toBeLessThan(25);
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
