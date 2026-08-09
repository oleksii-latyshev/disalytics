import { asTick, type ParsedDemo, type Round, type TickTrack } from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import { positionOnSpine, roundBoundaries } from '../helpers/spine';

const SAMPLE_HZ = 16;
const TICK_RATE = 64;

function newTrack(frameCount: number): TickTrack {
  return {
    tickRate: TICK_RATE,
    sampleHz: SAMPLE_HZ,
    frameCount,
    slotCount: 1,
    posX: new Float32Array(frameCount),
    posY: new Float32Array(frameCount),
    posZ: new Float32Array(frameCount),
    yaw: new Int16Array(frameCount),
    pitch: new Int16Array(frameCount),
    health: new Uint8Array(frameCount),
    flags: new Uint8Array(frameCount),
    speed: new Uint16Array(frameCount),
  };
}

function newRound(number: number, startTick: number): Round {
  return {
    number,
    startTick: asTick(startTick),
    freezeTimeEndTick: asTick(startTick + 640),
    endTick: asTick(startTick + 6400),
    winner: 'CT',
    reason: 'all-t-eliminated',
    economy: [],
  };
}

function newDemo(frameCount: number, rounds: readonly Round[]): ParsedDemo {
  return {
    header: { map: 'de_dust2', tickRate: TICK_RATE, players: [] },
    track: newTrack(frameCount),
    events: {
      rounds,
      kills: [],
      damage: [],
      grenades: [],
      blinds: [],
      plants: [],
      defuses: [],
    },
  };
}

describe('positionOnSpine', () => {
  it('puts the first sample on the left edge', () => {
    expect(positionOnSpine(0, 1000, 500)).toBe(0);
  });

  it('puts the last sample on the right edge', () => {
    expect(positionOnSpine(1000, 1000, 500)).toBe(500);
  });

  it('places a position between two samples proportionally', () => {
    expect(positionOnSpine(250.5, 1000, 500)).toBeCloseTo(125.25);
  });

  it('clamps a position outside the track onto the strip', () => {
    expect(positionOnSpine(-40, 1000, 500)).toBe(0);
    expect(positionOnSpine(4000, 1000, 500)).toBe(500);
  });

  it('collapses to the left edge for a match with no length', () => {
    expect(positionOnSpine(12, 0, 500)).toBe(0);
  });
});

describe('roundBoundaries', () => {
  it('places one hairline per round start', () => {
    const demo = newDemo(2001, [newRound(1, 0), newRound(2, 4000), newRound(3, 8000)]);

    expect(roundBoundaries(demo)).toEqual([
      { round: 1, fraction: 0 },
      { round: 2, fraction: 1000 / 2000 },
      { round: 3, fraction: 1 },
    ]);
  });

  it('places a single round at the start of the strip', () => {
    expect(roundBoundaries(newDemo(2001, [newRound(1, 0)]))).toEqual([{ round: 1, fraction: 0 }]);
  });

  it('has nothing to place for a match with no rounds', () => {
    expect(roundBoundaries(newDemo(2001, []))).toEqual([]);
  });

  it('has nothing to place against a track with no samples', () => {
    expect(roundBoundaries(newDemo(0, [newRound(1, 0)]))).toEqual([]);
  });
});
