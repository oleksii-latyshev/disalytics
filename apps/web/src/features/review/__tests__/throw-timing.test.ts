import {
  asFrame,
  asPlayerSlot,
  asTick,
  type Grenade,
  type Round,
  type UtilityThrow,
} from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import { throwElapsedSeconds } from '../helpers/throw-timing';

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
