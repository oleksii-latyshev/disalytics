import { asPlayerSlot, type PlayerInfo } from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import { teamsBySlot } from '../helpers/teams';

function newPlayer(slot: number, team: PlayerInfo['team']): PlayerInfo {
  return { slot: asPlayerSlot(slot), steamId: `7656119${slot}`, name: `player ${slot}`, team };
}

describe('teamsBySlot', () => {
  it('indexes the roster by the slot each player occupies', () => {
    const teams = teamsBySlot([newPlayer(0, 'CT'), newPlayer(1, 'T')]);

    expect(teams[0]).toBe('CT');
    expect(teams[1]).toBe('T');
  });

  it('leaves a slot no player occupies undefined rather than guessing a side', () => {
    const teams = teamsBySlot([newPlayer(4, 'T')]);

    expect(teams[0]).toBeUndefined();
    expect(teams[4]).toBe('T');
  });

  it('reads an empty roster as no sides at all', () => {
    expect(teamsBySlot([])).toHaveLength(0);
  });
});
