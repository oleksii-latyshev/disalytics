import { describe, expect, it } from 'vitest';
import {
  frameForTick,
  lastFrame,
  openingFrame,
  playersOnSide,
  roundClockAtFrame,
  roundIndexAtFrame,
  roundOpeningFrame,
  sampleAt,
  secondsAtFrame,
  sidesBySlotAtRound,
  slotSampleIndex,
  tickAtFrame,
} from '../helpers/selectors';
import {
  asFrame,
  asPlayerSlot,
  asTick,
  type ParsedDemo,
  type PlayerInfo,
  type Round,
} from '../schema';
import { atFrame, newEvents, newTrack } from './helpers';

const header = { map: 'de_dust2', tickRate: 64, players: [], weapons: [] };

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

describe('sidesBySlotAtRound', () => {
  const players: PlayerInfo[] = [
    { slot: asPlayerSlot(0), steamId: '1', name: 'one', team: 'T' },
    { slot: asPlayerSlot(1), steamId: '2', name: 'two', team: 'CT' },
  ];

  function newDemo(rounds: readonly Round[]): ParsedDemo {
    return {
      header: { ...header, players },
      track: newTrack(),
      events: { ...newEvents(), rounds },
    };
  }

  const firstHalf = newRound({
    number: 1,
    economy: [
      { slot: asPlayerSlot(0), money: 800, equipmentValue: 200, buyType: 'pistol', team: 'CT' },
      { slot: asPlayerSlot(1), money: 800, equipmentValue: 200, buyType: 'pistol', team: 'T' },
    ],
  });

  it('reads the side out of the round rather than out of the end-of-match roster', () => {
    const sides = sidesBySlotAtRound(newDemo([firstHalf]), 0);

    expect(sides[0]).toBe('CT');
    expect(sides[1]).toBe('T');
  });

  it('answers warmup with the opening round, which no round covers', () => {
    const sides = sidesBySlotAtRound(newDemo([firstHalf]), undefined);

    expect(sides[0]).toBe('CT');
  });

  it('falls back to the roster for a slot the round has no side for', () => {
    const partial = newRound({
      number: 2,
      economy: [{ slot: asPlayerSlot(0), money: 0, equipmentValue: 0, buyType: 'eco', team: null }],
    });

    const sides = sidesBySlotAtRound(newDemo([partial]), 0);

    expect(sides[0]).toBe('T');
    expect(sides[1]).toBe('CT');
  });

  it('falls back to the roster for a match with no rounds at all', () => {
    expect(sidesBySlotAtRound(newDemo([]), 0)).toEqual(['T', 'CT']);
  });
});

describe('slotSampleIndex', () => {
  it('indexes a buffer at frame * slotCount + slot', () => {
    const track = newTrack({ frameCount: 4, slotCount: 3 });

    expect(slotSampleIndex(track, 0, 0)).toBe(0);
    expect(slotSampleIndex(track, 0, 2)).toBe(2);
    expect(slotSampleIndex(track, 3, 1)).toBe(10);
  });

  it('agrees with the write the test helper makes', () => {
    const track = newTrack({ frameCount: 2, slotCount: 2 });
    atFrame(track, asFrame(1), asPlayerSlot(1), { money: 4200 });

    expect(sampleAt(track.money, slotSampleIndex(track, 1, 1))).toBe(4200);
  });
});

describe('roundClockAtFrame', () => {
  const track = newTrack({ tickRate: 64, sampleHz: 16, frameCount: 2000 });

  function newDemo(rounds: readonly Round[]): ParsedDemo {
    return { header, track, events: { ...newEvents(), rounds } };
  }

  const round = newRound({
    startTick: asTick(640),
    freezeTimeEndTick: asTick(1280),
    endTick: asTick(4480),
  });

  const demo = newDemo([round]);

  it('counts the buy phase down to zero', () => {
    // frame 200 is tick 800 at 64/16 — 480 ticks, seven and a half seconds, short of the freeze end.
    expect(roundClockAtFrame(demo, 200)).toEqual({ phase: 'freeze', seconds: 8 });
  });

  it('opens the buy phase on its full length rather than one second below it', () => {
    expect(roundClockAtFrame(demo, 160)).toEqual({ phase: 'freeze', seconds: 10 });
  });

  it('counts up from the end of the freeze time', () => {
    // frame 400 is tick 1600, which is 320 ticks — five seconds — past the freeze end.
    expect(roundClockAtFrame(demo, 400)).toEqual({ phase: 'live', seconds: 5 });
  });

  it('holds the ending time through the post-round rather than counting on', () => {
    // The round ran 3200 ticks, fifty seconds, and frame 1200 is well past its last tick.
    expect(roundClockAtFrame(demo, 1200)).toEqual({ phase: 'post', seconds: 50 });
  });

  it('has no answer during warmup, which no round covers', () => {
    expect(roundClockAtFrame(demo, 0)).toBeUndefined();
  });

  it('has no answer for a match with no rounds', () => {
    expect(roundClockAtFrame(newDemo([]), 400)).toBeUndefined();
  });
});

describe('playersOnSide', () => {
  const players: PlayerInfo[] = [
    { slot: asPlayerSlot(2), steamId: '3', name: 'three', team: 'T' },
    { slot: asPlayerSlot(0), steamId: '1', name: 'one', team: 'T' },
    { slot: asPlayerSlot(1), steamId: '2', name: 'two', team: 'CT' },
  ];

  it('keeps only the side asked for, in slot order', () => {
    const sides = ['T', 'CT', 'T'] as const;

    expect(playersOnSide(players, sides, 'T').map((player) => player.slot)).toEqual([0, 2]);
    expect(playersOnSide(players, sides, 'CT').map((player) => player.slot)).toEqual([1]);
  });

  it('leaves out a slot no source named a side for', () => {
    expect(playersOnSide(players, [], 'T')).toEqual([]);
  });
});
