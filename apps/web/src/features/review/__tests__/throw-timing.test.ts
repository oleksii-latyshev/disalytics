import {
  asFrame,
  asPlayerSlot,
  asTick,
  type Grenade,
  type ParsedDemo,
  type Round,
  type UtilityThrow,
} from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import { createClockFormat } from '@/core/playback';
import { formatThrowTiming, matchesTiming, throwElapsedSeconds } from '../helpers/throw-timing';

function makeMockRound(freezeTimeEndTick = 1000, roundTimeSeconds = 115): Round {
  return {
    number: 1,
    startTick: asTick(500),
    freezeTimeEndTick: asTick(freezeTimeEndTick),
    endTick: asTick(freezeTimeEndTick + 64 * 115),
    winner: 'CT',
    reason: 'all-t-eliminated',
    roundTimeSeconds,
    economy: [],
  };
}

function makeMockThrow(throwTick: number, frame = 10): UtilityThrow {
  const landing = { x: 0, y: 0, z: 0 };
  const grenade: Grenade = {
    thrower: asPlayerSlot(0),
    type: 'smokegrenade',
    throwTick: asTick(throwTick),
    detonationTick: asTick(throwTick + 128),
    detonationPosition: landing,
    expiryTick: asTick(throwTick + 64 * 18),
    trajectory: {
      sampleHz: 16,
      firstTick: asTick(throwTick),
      sampleCount: 1,
      x: new Float32Array([0]),
      y: new Float32Array([0]),
      z: new Float32Array([0]),
    },
  };

  return {
    roundIndex: 0,
    grenade,
    throwerSide: 'CT',
    frame: asFrame(frame),
    landing,
  };
}

describe('throwElapsedSeconds', () => {
  it('calculates 0 when thrown at freeze time end', () => {
    const round = makeMockRound(1000);
    const thrown = makeMockThrow(1000);
    expect(throwElapsedSeconds(thrown, round, 64)).toBe(0);
  });

  it('calculates elapsed seconds from freeze time end', () => {
    const round = makeMockRound(1000);
    const thrown = makeMockThrow(1000 + 64 * 18);
    expect(throwElapsedSeconds(thrown, round, 64)).toBe(18);
  });

  it('clamps to 0 if throw tick is before freeze time end', () => {
    const round = makeMockRound(1000);
    const thrown = makeMockThrow(800);
    expect(throwElapsedSeconds(thrown, round, 64)).toBe(0);
  });

  it('returns 0 if tickRate is 0 or negative', () => {
    const round = makeMockRound(1000);
    const thrown = makeMockThrow(2000);
    expect(throwElapsedSeconds(thrown, round, 0)).toBe(0);
  });
});

describe('matchesTiming', () => {
  it('handles "all" scope', () => {
    expect(matchesTiming('all', 0)).toBe(true);
    expect(matchesTiming('all', 15)).toBe(true);
    expect(matchesTiming('all', 30)).toBe(true);
    expect(matchesTiming('all', 90)).toBe(true);
  });

  it('handles "early" scope (0–20s)', () => {
    expect(matchesTiming('early', 0)).toBe(true);
    expect(matchesTiming('early', 19)).toBe(true);
    expect(matchesTiming('early', 20)).toBe(false);
    expect(matchesTiming('early', 45)).toBe(false);
  });

  it('handles "mid" scope (20–60s)', () => {
    expect(matchesTiming('mid', 19)).toBe(false);
    expect(matchesTiming('mid', 20)).toBe(true);
    expect(matchesTiming('mid', 59)).toBe(true);
    expect(matchesTiming('mid', 60)).toBe(false);
  });

  it('handles "late" scope (60s+)', () => {
    expect(matchesTiming('late', 0)).toBe(false);
    expect(matchesTiming('late', 59)).toBe(false);
    expect(matchesTiming('late', 60)).toBe(true);
    expect(matchesTiming('late', 85)).toBe(true);
  });
});

describe('formatThrowTiming', () => {
  it('formats elapsed and remaining time when clock is available', () => {
    const round = makeMockRound(1000, 115);
    // 18s played at 64 tick: tick = 1000 + 64 * 18 = 2152.
    // frame for tick 2152 at 16Hz: Math.round((2152 / 64) * 16) = 538
    const throwTick = 1000 + 64 * 18;
    const frame = 538;
    const thrown = makeMockThrow(throwTick, frame);
    const format = createClockFormat('en');

    const demo = {
      track: {
        tickRate: 64,
        sampleHz: 16,
        frameCount: 1000,
        ticks: new Int32Array([throwTick]),
      },
      events: {
        rounds: [round],
        plants: [],
      },
      header: {},
    } as unknown as ParsedDemo;

    const formatted = formatThrowTiming(thrown, round, demo, format);
    // Elapsed 18s = 00:18. With 115s round time and 18s played, remaining is 97s = 01:37
    expect(formatted).toBe('00:18 / 01:37');
  });

  it('falls back to elapsed time if clock is unavailable', () => {
    const round = makeMockRound(1000, 115);
    const thrown = makeMockThrow(1000 + 64 * 25, 9999);
    const format = createClockFormat('en');

    const demo = {
      track: {
        tickRate: 64,
        sampleHz: 16,
        frameCount: 10,
        ticks: new Int32Array([0]),
      },
      events: {
        rounds: [],
        plants: [],
      },
      header: {},
    } as unknown as ParsedDemo;

    const formatted = formatThrowTiming(thrown, round, demo, format);
    expect(formatted).toBe('00:25');
  });
});
