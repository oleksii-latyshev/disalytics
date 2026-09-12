import { describe, expect, it } from 'vitest';
import { matchUtility } from '../helpers/utility-throws';
import {
  asPlayerSlot,
  asTick,
  type MatchEvents,
  type ParsedDemo,
  type Round,
  type Team,
} from '../schema';
import { newEvents, newTrack, withGrenade } from './helpers';

const ct = asPlayerSlot(0);
const terrorist = asPlayerSlot(1);

const landing = { x: 100, y: 200, z: 0 };

/** The same two slots, on opposite sides in each half — which is what a whole-match reading trips on. */
function newRound(number: number, startTick: number, sides: readonly [Team, Team]): Round {
  return {
    number,
    startTick: asTick(startTick),
    freezeTimeEndTick: asTick(startTick + 100),
    endTick: asTick(startTick + 800),
    winner: 'CT',
    reason: 'all-t-eliminated',
    roundTimeSeconds: null,
    economy: [
      { slot: ct, money: 0, equipmentValue: 0, buyType: 'full-buy', team: sides[0] },
      { slot: terrorist, money: 0, equipmentValue: 0, buyType: 'full-buy', team: sides[1] },
    ],
  };
}

const firstHalf = newRound(1, 100, ['CT', 'T']);
const secondHalf = newRound(2, 2000, ['T', 'CT']);

function newDemo(events: MatchEvents, rounds: readonly Round[]): ParsedDemo {
  return {
    header: { map: 'de_dust2', tickRate: 64, players: [], weapons: [] },
    track: newTrack({ frameCount: 2000 }),
    events: { ...events, rounds },
  };
}

describe('matchUtility', () => {
  it('reads each throw against the sides that round recorded, not the end-of-match roster', () => {
    const events = withGrenade(
      withGrenade(newEvents(), {
        throwTick: asTick(400),
        thrower: ct,
        detonationPosition: landing,
      }),
      { throwTick: asTick(2400), thrower: ct, detonationPosition: landing },
    );

    const throws = matchUtility(newDemo(events, [firstHalf, secondHalf]));

    expect(throws.map((thrown) => thrown.throwerSide)).toEqual(['CT', 'T']);
    expect(throws.map((thrown) => thrown.roundIndex)).toEqual([0, 1]);
  });

  it('reads the frame the grenade was thrown on', () => {
    const events = withGrenade(newEvents(), {
      throwTick: asTick(448),
      detonationPosition: landing,
    });

    const [thrown] = matchUtility(newDemo(events, [firstHalf]));

    // 448 ticks at 64 Hz is 7 s, which is frame 112 of a track sampled at 16 Hz.
    expect(thrown?.frame).toBe(112);
  });

  it('leaves out a grenade the round was cleaned up around, which has nowhere to land', () => {
    const events = withGrenade(newEvents(), { throwTick: asTick(400), detonationPosition: null });

    expect(matchUtility(newDemo(events, [firstHalf]))).toEqual([]);
  });

  it('leaves out a grenade thrown after the round ended', () => {
    const events = withGrenade(newEvents(), {
      throwTick: asTick(950),
      detonationPosition: landing,
    });

    expect(matchUtility(newDemo(events, [firstHalf]))).toEqual([]);
  });

  it('keeps the grenade it was thrown as, so a mark can be drawn in its own colour', () => {
    const events = withGrenade(newEvents(), {
      throwTick: asTick(400),
      type: 'incgrenade',
      detonationPosition: landing,
    });

    expect(matchUtility(newDemo(events, [firstHalf]))[0]?.grenade.type).toBe('incgrenade');
  });

  it('has nothing to say for a match with no rounds', () => {
    const events = withGrenade(newEvents(), {
      throwTick: asTick(400),
      detonationPosition: landing,
    });

    expect(matchUtility(newDemo(events, []))).toEqual([]);
  });
});
