import { describe, expect, it } from 'vitest';
import { frameForTick, openingFrame, sampleAt } from '../helpers/selectors';
import { asFrame, asPlayerSlot, asTick, type ParsedDemo, type Round } from '../schema';
import { atFrame, newEvents, newTrack } from './helpers';

const header = { map: 'de_dust2', tickRate: 64, players: [] };

function newRound(overrides: Partial<Round> = {}): Round {
  return {
    number: 1,
    startTick: asTick(0),
    freezeTimeEndTick: asTick(0),
    endTick: asTick(0),
    winner: 'CT',
    reason: 'all-t-eliminated',
    economy: [],
    ...overrides,
  };
}

describe('sampleAt', () => {
  it('reads the value at the index', () => {
    const track = newTrack({ frameCount: 2, slotCount: 2 });
    atFrame(track, asFrame(1), asPlayerSlot(1), { posX: 128 });

    expect(sampleAt(track.posX, 3)).toBe(128);
  });

  it('throws rather than substituting a value outside the buffer', () => {
    const track = newTrack({ frameCount: 1, slotCount: 1 });

    expect(() => sampleAt(track.posX, 1)).toThrow(RangeError);
  });
});

describe('frameForTick', () => {
  it('converts at the ratio between the tick rate and the sample rate', () => {
    const track = newTrack({ tickRate: 64, sampleHz: 16, frameCount: 100 });

    expect(frameForTick(track, asTick(0))).toBe(0);
    expect(frameForTick(track, asTick(64))).toBe(16);
    expect(frameForTick(track, asTick(128))).toBe(32);
  });

  it('rounds to the nearest sample rather than truncating', () => {
    const track = newTrack({ tickRate: 64, sampleHz: 16, frameCount: 100 });

    expect(frameForTick(track, asTick(3))).toBe(1);
  });

  it('clamps a tick past the end of the track', () => {
    const track = newTrack({ tickRate: 64, sampleHz: 16, frameCount: 8 });

    expect(frameForTick(track, asTick(100_000))).toBe(7);
  });

  it('answers 0 for a track with no samples at all', () => {
    const track = newTrack({ frameCount: 0 });

    expect(frameForTick(track, asTick(1000))).toBe(0);
  });
});

describe('openingFrame', () => {
  it('lands on the end of the first round’s freeze time', () => {
    const demo: ParsedDemo = {
      header,
      track: newTrack({ tickRate: 64, sampleHz: 16, frameCount: 2000 }),
      events: {
        ...newEvents(),
        rounds: [
          newRound({ number: 1, freezeTimeEndTick: asTick(640) }),
          newRound({ number: 2, freezeTimeEndTick: asTick(6400) }),
        ],
      },
    };

    expect(openingFrame(demo)).toBe(160);
  });

  it('falls back to the first sample when the demo carries no rounds', () => {
    const demo: ParsedDemo = { header, track: newTrack(), events: newEvents() };

    expect(openingFrame(demo)).toBe(0);
  });
});
