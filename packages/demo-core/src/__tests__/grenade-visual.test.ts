import { describe, expect, it } from 'vitest';
import {
  AREA_FADE_SECONDS,
  AREA_START_EXTENT,
  createVisualScratch,
  grenadeVisual,
  HE_EXPAND_SECONDS,
  SMOKE_END_EXTENT,
} from '../helpers/grenade-visual';
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

    it('holds the ring and fades it once the blast has stopped growing', () => {
      // HE_EXPAND_SECONDS = 0.35s = 22.4 ticks, so tick 130 is 0.47s — into the linger.
      grenadeVisual(firstGrenade(events), asTick(130), TICK_RATE, scratch);
      expect(scratch.phase).toBe('linger');
      // Its own span rather than the whole life's, so the ring has something to fade on.
      expect(scratch.progress).toBeGreaterThan(0);
      expect(scratch.progress).toBeLessThan(1);
    });

    it('is null after linger period', () => {
      // HE_EXPAND_SECONDS + HE_LINGER_SECONDS = 1.0s = 64 ticks
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
      // FLASH_EXPAND_SECONDS = 0.4s = 25.6 ticks
      grenadeVisual(firstGrenade(events), asTick(130), TICK_RATE, scratch);
      expect(scratch.phase).toBeNull();
    });
  });

  describe('smoke grenade', () => {
    // 18s smoke: detonation at tick 100, expiry at tick 100 + 18*64 = 1252
    const events = smokeAt(0, 100, 1252);

    it('shows an active body at full alpha and full extent during its lifetime', () => {
      // 5 seconds after detonation
      grenadeVisual(firstGrenade(events), asTick(420), TICK_RATE, scratch);
      expect(scratch.phase).toBe('active');
      expect(scratch.alpha).toBeCloseTo(0.3);
      expect(scratch.extent).toBeCloseTo(1);
    });

    it('arrives rather than appearing', () => {
      // On the detonation tick it is a canister, and it has filled a second later.
      grenadeVisual(firstGrenade(events), asTick(100), TICK_RATE, scratch);
      expect(scratch.extent).toBeCloseTo(AREA_START_EXTENT, 5);

      grenadeVisual(firstGrenade(events), asTick(100 + TICK_RATE / 2), TICK_RATE, scratch);
      const halfway = scratch.extent;
      expect(halfway).toBeGreaterThan(AREA_START_EXTENT);
      expect(halfway).toBeLessThan(1);

      grenadeVisual(firstGrenade(events), asTick(100 + TICK_RATE), TICK_RATE, scratch);
      expect(scratch.extent).toBeCloseTo(1, 5);
    });

    it('settles back rather than vanishing at full size', () => {
      grenadeVisual(firstGrenade(events), asTick(1252), TICK_RATE, scratch);
      expect(scratch.extent).toBeCloseTo(SMOKE_END_EXTENT, 5);
    });

    it('states its remaining life in whole seconds, and never a negative one', () => {
      grenadeVisual(firstGrenade(events), asTick(1252 - TICK_RATE * 3), TICK_RATE, scratch);
      expect(scratch.remainingSeconds).toBe(3);

      grenadeVisual(firstGrenade(events), asTick(1252), TICK_RATE, scratch);
      expect(scratch.remainingSeconds).toBe(0);
    });

    it('reads the same going backwards as going forwards', () => {
      grenadeVisual(firstGrenade(events), asTick(300), TICK_RATE, scratch);
      const forwards = { extent: scratch.extent, alpha: scratch.alpha };

      grenadeVisual(firstGrenade(events), asTick(1000), TICK_RATE, scratch);
      grenadeVisual(firstGrenade(events), asTick(300), TICK_RATE, scratch);

      expect(scratch.extent).toBe(forwards.extent);
      expect(scratch.alpha).toBe(forwards.alpha);
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
