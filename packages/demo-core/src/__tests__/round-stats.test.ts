import { describe, expect, it } from 'vitest';
import { playerRoundStats, roundSurvivors } from '../helpers/round-stats';
import { asPlayerSlot, asTick, type MatchEvents, type ParsedDemo, type Round } from '../schema';
import { newEvents, newTrack, withDamage, withKill } from './helpers';

const first = asPlayerSlot(0);
const enemy = asPlayerSlot(1);
const mate = asPlayerSlot(2);
const stranger = asPlayerSlot(3);

const round: Round = {
  number: 1,
  startTick: asTick(100),
  freezeTimeEndTick: asTick(200),
  endTick: asTick(900),
  winner: 'CT',
  reason: 'all-t-eliminated',
  roundTimeSeconds: null,
  economy: [
    { slot: first, money: 1200, equipmentValue: 4700, buyType: 'full-buy', team: 'CT' },
    { slot: enemy, money: 800, equipmentValue: 1400, buyType: 'eco', team: 'T' },
    { slot: mate, money: 900, equipmentValue: 3100, buyType: 'full-buy', team: 'CT' },
  ],
};

function newDemo(events: MatchEvents, rounds: readonly Round[] = [round]): ParsedDemo {
  return {
    header: { map: 'de_nuke', tickRate: 64, players: [], weapons: [] },
    track: newTrack(),
    events: { ...events, rounds },
  };
}

describe('roundSurvivors', () => {
  it('counts each side, less the players it lost inside the round', () => {
    const events = withKill(newEvents(), { tick: asTick(400), attacker: enemy, victim: mate });

    expect(roundSurvivors(newDemo(events), 0)).toEqual({ CT: 1, T: 1 });
  });

  it('takes the losing side down as well as the winning one', () => {
    const events = withKill(newEvents(), { tick: asTick(400), attacker: first, victim: enemy });

    expect(roundSurvivors(newDemo(events), 0)).toEqual({ CT: 2, T: 0 });
  });

  it('does not count the post-round kills that follow most rounds', () => {
    const events = withKill(newEvents(), { tick: asTick(950), attacker: enemy, victim: mate });

    expect(roundSurvivors(newDemo(events), 0)).toEqual({ CT: 2, T: 1 });
  });

  it('puts a slot the round recorded no side for on neither side', () => {
    // A four-man side reads a maximum of four, and the death of the slot with no side changes
    // nothing — that is the correct answer rather than an off-by-one.
    const fourMan: Round = {
      ...round,
      economy: [
        ...round.economy,
        { slot: stranger, money: 0, equipmentValue: 0, buyType: 'full-buy', team: null },
      ],
    };
    const events = withKill(newEvents(), { tick: asTick(400), attacker: enemy, victim: stranger });

    expect(roundSurvivors(newDemo(events, [fourMan]), 0)).toEqual({ CT: 2, T: 1 });
  });

  it('has nothing to say for a round that does not exist', () => {
    expect(roundSurvivors(newDemo(newEvents()), 7)).toEqual({ CT: 0, T: 0 });
  });
});

describe('playerRoundStats', () => {
  it('counts kills and deaths inside the round', () => {
    let events = withKill(newEvents(), { tick: asTick(300), attacker: first, victim: enemy });
    events = withKill(events, { tick: asTick(400), attacker: enemy, victim: first });

    expect(playerRoundStats(newDemo(events), 0, first)).toMatchObject({ kills: 1, deaths: 1 });
  });

  it('ignores what happened in another round', () => {
    let events = withKill(newEvents(), { tick: asTick(50), attacker: first, victim: enemy });
    events = withKill(events, { tick: asTick(1000), attacker: first, victim: enemy });

    expect(playerRoundStats(newDemo(events), 0, first).kills).toBe(0);
  });

  it('counts a kill during the buy phase, which is always a story', () => {
    const events = withKill(newEvents(), { tick: asTick(150), attacker: first, victim: enemy });

    expect(playerRoundStats(newDemo(events), 0, first).kills).toBe(1);
  });

  it('adds up health damage to opponents only', () => {
    let events = withDamage(newEvents(), {
      tick: asTick(300),
      attacker: first,
      victim: enemy,
      healthDamage: 42,
    });
    events = withDamage(events, {
      tick: asTick(310),
      attacker: first,
      victim: mate,
      healthDamage: 30,
    });
    events = withDamage(events, {
      tick: asTick(320),
      attacker: first,
      victim: first,
      healthDamage: 12,
    });

    expect(playerRoundStats(newDemo(events), 0, first).damage).toBe(42);
  });

  it('reads the equipment the round recorded at freeze-time end', () => {
    expect(playerRoundStats(newDemo(newEvents()), 0, first).equipmentValue).toBe(4700);
  });

  it('has nothing to say during warmup or for a match with no rounds', () => {
    const empty = { kills: 0, deaths: 0, damage: 0, equipmentValue: 0 };

    expect(playerRoundStats(newDemo(newEvents()), undefined, first)).toEqual(empty);
    expect(playerRoundStats(newDemo(newEvents(), []), 0, first)).toEqual(empty);
  });
});
