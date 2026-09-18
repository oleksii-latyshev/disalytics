import { describe, expect, it } from 'vitest';
import { matchClutches } from '../helpers/clutches';
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
const ctTeammate = asPlayerSlot(2);
const terroristTeammate = asPlayerSlot(3);

function newRound(
  number: number,
  startTick: number,
  winner: Team,
  sides: readonly [Team, Team, Team, Team],
): Round {
  return {
    number,
    startTick: asTick(startTick),
    freezeTimeEndTick: asTick(startTick + 100),
    endTick: asTick(startTick + 800),
    winner,
    reason: winner === 'CT' ? 'all-t-eliminated' : 'all-ct-eliminated',
    roundTimeSeconds: null,
    economy: [
      { slot: ct, money: 0, equipmentValue: 0, buyType: 'full-buy', team: sides[0] },
      { slot: terrorist, money: 0, equipmentValue: 0, buyType: 'full-buy', team: sides[1] },
      { slot: ctTeammate, money: 0, equipmentValue: 0, buyType: 'full-buy', team: sides[2] },
      { slot: terroristTeammate, money: 0, equipmentValue: 0, buyType: 'full-buy', team: sides[3] },
    ],
  };
}

function newDemo(events: MatchEvents, rounds: readonly Round[]): ParsedDemo {
  return {
    header: { map: 'de_dust2', tickRate: 64, players: [], weapons: [] },
    track: newTrack({ frameCount: 2000 }),
    events: { ...events, rounds },
  };
}

describe('matchClutches', () => {
  it('counts a 1v2 clutch win for CT when one CT survives against two opponents', () => {
    const round = newRound(1, 100, 'CT', ['CT', 'T', 'CT', 'T']);
    const events = withKill(
      withKill(
        withKill(newEvents(), {
          tick: asTick(200),
          attacker: terrorist,
          victim: ctTeammate,
        }),
        {
          tick: asTick(300),
          attacker: ct,
          victim: terroristTeammate,
        },
      ),
      {
        tick: asTick(400),
        attacker: ct,
        victim: terrorist,
      },
    );

    const clutches = matchClutches(newDemo(events, [round]));

    expect(clutches).toEqual([
      {
        roundIndex: 0,
        player: ct,
        side: 'CT',
        opponents: 2,
      },
    ]);
  });

  it('reads each round against round economy sides across halftime', () => {
    const firstHalf = newRound(1, 100, 'CT', ['CT', 'T', 'CT', 'T']);
    const secondHalf = newRound(2, 2000, 'T', ['T', 'CT', 'T', 'CT']);

    const events = withKill(
      withKill(
        withKill(
          withKill(newEvents(), {
            tick: asTick(200),
            attacker: terrorist,
            victim: ctTeammate,
          }),
          {
            tick: asTick(300),
            attacker: ct,
            victim: terrorist,
          },
        ),
        {
          tick: asTick(2200),
          attacker: terrorist,
          victim: ctTeammate,
        },
      ),
      {
        tick: asTick(2300),
        attacker: ct,
        victim: terrorist,
      },
    );

    const clutches = matchClutches(newDemo(events, [firstHalf, secondHalf]));

    expect(clutches).toHaveLength(2);
    expect(clutches[0]).toEqual({
      roundIndex: 0,
      player: ct,
      side: 'CT',
      opponents: 2,
    });
    expect(clutches[1]).toEqual({
      roundIndex: 1,
      player: ct,
      side: 'T',
      opponents: 2,
    });
  });

  it('ignores rounds won with multiple survivors', () => {
    const round = newRound(1, 100, 'CT', ['CT', 'T', 'CT', 'T']);
    const events = withKill(
      withKill(newEvents(), {
        tick: asTick(200),
        attacker: ct,
        victim: terrorist,
      }),
      {
        tick: asTick(300),
        attacker: ctTeammate,
        victim: terroristTeammate,
      },
    );

    const clutches = matchClutches(newDemo(events, [round]));

    expect(clutches).toEqual([]);
  });

  it('does not count a clutch win if the lone survivor died before round end', () => {
    const round: Round = {
      ...newRound(1, 100, 'T', ['CT', 'T', 'CT', 'T']),
      reason: 'bomb-exploded',
    };
    const events = withKill(
      withKill(
        withKill(newEvents(), {
          tick: asTick(200),
          attacker: ct,
          victim: terroristTeammate,
        }),
        {
          tick: asTick(300),
          attacker: terrorist,
          victim: ctTeammate,
        },
      ),
      {
        tick: asTick(400),
        attacker: ct,
        victim: terrorist,
      },
    );

    const clutches = matchClutches(newDemo(events, [round]));

    expect(clutches).toEqual([]);
  });

  it('ignores kills outside the round window', () => {
    const round = newRound(1, 100, 'CT', ['CT', 'T', 'CT', 'T']);
    const events = withKill(
      withKill(newEvents(), {
        tick: asTick(50),
        attacker: terrorist,
        victim: ctTeammate,
      }),
      {
        tick: asTick(950),
        attacker: ct,
        victim: terrorist,
      },
    );

    const clutches = matchClutches(newDemo(events, [round]));

    expect(clutches).toEqual([]);
  });

  it('ignores rounds without economy or with a draw', () => {
    const emptyEconomy: Round = {
      ...newRound(1, 100, 'CT', ['CT', 'T', 'CT', 'T']),
      economy: [],
    };
    const drawRound: Round = {
      ...newRound(2, 2000, 'CT', ['CT', 'T', 'CT', 'T']),
      reason: 'draw',
    };

    const clutches = matchClutches(newDemo(newEvents(), [emptyEconomy, drawRound]));

    expect(clutches).toEqual([]);
  });

  it('counts a clutch when friendly fire reduces the winning team to one player', () => {
    const round = newRound(1, 100, 'CT', ['CT', 'T', 'CT', 'T']);
    const events = withKill(
      withKill(
        withKill(newEvents(), {
          tick: asTick(200),
          attacker: ct,
          victim: ctTeammate,
        }),
        {
          tick: asTick(300),
          attacker: ct,
          victim: terrorist,
        },
      ),
      {
        tick: asTick(400),
        attacker: ct,
        victim: terroristTeammate,
      },
    );

    const clutches = matchClutches(newDemo(events, [round]));

    expect(clutches).toEqual([
      {
        roundIndex: 0,
        player: ct,
        side: 'CT',
        opponents: 2,
      },
    ]);
  });
});
