import { describe, expect, it } from 'vitest';
import {
  frameForTick,
  lastFrame,
  openingFrame,
  roundIndexAtFrame,
  roundOpeningFrame,
  sampleAt,
  secondsAtFrame,
  tickAtFrame,
} from '../helpers/selectors';
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

describe('lastFrame', () => {
  it('is one below the sample count', () => {
    expect(lastFrame(newTrack({ frameCount: 2000 }))).toBe(1999);
  });

  it('is 0 for a track with no samples at all', () => {
    expect(lastFrame(newTrack({ frameCount: 0 }))).toBe(0);
  });
});

describe('secondsAtFrame', () => {
  it('divides a sample position by the rate it was sampled at', () => {
    expect(secondsAtFrame(newTrack({ sampleHz: 16 }), 160)).toBe(10);
  });

  it('reads a position between two samples', () => {
    expect(secondsAtFrame(newTrack({ sampleHz: 16 }), 8.5)).toBeCloseTo(0.53125);
  });

  it('answers 0 for a track sampled at no rate', () => {
    expect(secondsAtFrame(newTrack({ sampleHz: 0 }), 160)).toBe(0);
  });
});

describe('tickAtFrame', () => {
  it('is the inverse of frameForTick', () => {
    const track = newTrack({ tickRate: 64, sampleHz: 16, frameCount: 2000 });

    expect(tickAtFrame(track, frameForTick(track, asTick(640)))).toBe(640);
  });

  it('rounds a position between two samples onto a tick', () => {
    const track = newTrack({ tickRate: 64, sampleHz: 16 });

    expect(tickAtFrame(track, 0.5)).toBe(2);
  });

  it('answers 0 for a track sampled at no rate', () => {
    expect(tickAtFrame(newTrack({ sampleHz: 0 }), 160)).toBe(0);
  });
});

describe('roundOpeningFrame', () => {
  it('lands on the end of that round’s freeze time', () => {
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

    expect(roundOpeningFrame(demo, 1)).toBe(1600);
  });

  it('falls back to the first sample for a round the match does not have', () => {
    const demo: ParsedDemo = { header, track: newTrack(), events: newEvents() };

    expect(roundOpeningFrame(demo, 7)).toBe(0);
  });
});

describe('roundIndexAtFrame', () => {
  const demo: ParsedDemo = {
    header,
    track: newTrack({ tickRate: 64, sampleHz: 16, frameCount: 4000 }),
    events: {
      ...newEvents(),
      rounds: [
        newRound({ number: 1, startTick: asTick(640) }),
        newRound({ number: 2, startTick: asTick(6400) }),
        newRound({ number: 3, startTick: asTick(12800) }),
      ],
    },
  };

  it('finds the round a position falls inside', () => {
    expect(roundIndexAtFrame(demo, 1700)).toBe(1);
  });

  it('finds the round that has just started', () => {
    expect(roundIndexAtFrame(demo, 1600)).toBe(1);
  });

  it('stays on the last round that started', () => {
    expect(roundIndexAtFrame(demo, 3999)).toBe(2);
  });

  it('answers nothing during warmup, which is not a round', () => {
    expect(roundIndexAtFrame(demo, 100)).toBeUndefined();
  });

  it('answers nothing for a match with no rounds', () => {
    const empty: ParsedDemo = { header, track: newTrack(), events: newEvents() };

    expect(roundIndexAtFrame(empty, 4)).toBeUndefined();
  });

  it('finds the only round of a single-round match', () => {
    const single: ParsedDemo = {
      header,
      track: newTrack({ tickRate: 64, sampleHz: 16, frameCount: 4000 }),
      events: { ...newEvents(), rounds: [newRound({ number: 1, startTick: asTick(0) })] },
    };

    expect(roundIndexAtFrame(single, 2000)).toBe(0);
  });
});
