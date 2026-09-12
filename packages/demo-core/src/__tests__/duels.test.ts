import { describe, expect, it } from 'vitest';
import { matchDuels } from '../helpers/duels';
import {
  asPlayerSlot,
  asTick,
  type MatchEvents,
  type ParsedDemo,
  type Round,
  type Team,
} from '../schema';
import { newEvents, newTrack, withKill } from './helpers';

const ct = asPlayerSlot(0);
const terrorist = asPlayerSlot(1);

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

describe('matchDuels', () => {
  it('reads each kill against the sides that round recorded, not the end-of-match roster', () => {
    const events = withKill(
      withKill(newEvents(), { tick: asTick(400), attacker: ct, victim: terrorist }),
      { tick: asTick(2400), attacker: ct, victim: terrorist },
    );

    const duels = matchDuels(newDemo(events, [firstHalf, secondHalf]));

    expect(duels.map((duel) => duel.attackerSide)).toEqual(['CT', 'T']);
    expect(duels.map((duel) => duel.victimSide)).toEqual(['T', 'CT']);
    expect(duels.map((duel) => duel.roundIndex)).toEqual([0, 1]);
  });

  it('reads the frame the kill happened on', () => {
    const events = withKill(newEvents(), { tick: asTick(448), attacker: ct, victim: terrorist });

    const [duel] = matchDuels(newDemo(events, [firstHalf]));

    // 448 ticks at 64 Hz is 7 s, which is frame 112 of a track sampled at 16 Hz.
    expect(duel?.frame).toBe(112);
  });

  it('leaves out a kill the world did, which has no end to draw from', () => {
    const events = withKill(newEvents(), { tick: asTick(400), attacker: null, victim: terrorist });

    expect(matchDuels(newDemo(events, [firstHalf]))).toEqual([]);
  });

  it('leaves out the post-round kills that follow most rounds', () => {
    const events = withKill(newEvents(), { tick: asTick(950), attacker: ct, victim: terrorist });

    expect(matchDuels(newDemo(events, [firstHalf]))).toEqual([]);
  });

  it('keeps a kill whose two ends are the same player', () => {
    const events = withKill(newEvents(), { tick: asTick(400), attacker: ct, victim: ct });

    expect(matchDuels(newDemo(events, [firstHalf]))).toHaveLength(1);
  });

  it('has nothing to say for a match with no rounds', () => {
    const events = withKill(newEvents(), { tick: asTick(400), attacker: ct, victim: terrorist });

    expect(matchDuels(newDemo(events, []))).toEqual([]);
  });
});
