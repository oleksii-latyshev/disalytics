import { asPlayerSlot, type PlayerStats } from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import { nextPlayerSort, PLAYER_COLUMNS, sortPlayers } from '../helpers/player-table';

function newStats(slot: number, overrides: Partial<PlayerStats> = {}): PlayerStats {
  return {
    slot: asPlayerSlot(slot),
    rounds: 10,
    kills: 0,
    assists: 0,
    deaths: 0,
    adr: 0,
    headshotPercent: 0,
    kastPercent: 0,
    openingWon: 0,
    openingLost: 0,
    tradeKills: 0,
    deathsTraded: 0,
    multiKillRounds: [0, 0, 0, 0],
    clutchesWon: 0,
    utilityDamage: 0,
    flashAssists: 0,
    enemyBlindSeconds: 0,
    rating: 1,
    ...overrides,
  };
}

const slotsOf = (players: readonly PlayerStats[]) => players.map((player) => player.slot);

describe('nextPlayerSort', () => {
  it('goes largest first, smallest first, then back to the table order', () => {
    const first = nextPlayerSort(null, 'kills');
    expect(first).toEqual({ column: 'kills', direction: 'desc' });
    const second = nextPlayerSort(first, 'kills');
    expect(second).toEqual({ column: 'kills', direction: 'asc' });
    expect(nextPlayerSort(second, 'kills')).toBeNull();
  });

  it('starts another column largest first', () => {
    expect(nextPlayerSort({ column: 'kills', direction: 'asc' }, 'adr')).toEqual({
      column: 'adr',
      direction: 'desc',
    });
  });
});

describe('sortPlayers', () => {
  const players = [
    newStats(0, { kills: 5, multiKillRounds: [0, 0, 0, 1] }),
    newStats(1, { kills: 9, multiKillRounds: [3, 0, 0, 0] }),
    newStats(2, { kills: 5, deaths: 7 }),
  ];

  it('leaves the order alone with no sort', () => {
    expect(slotsOf(sortPlayers(players, null))).toEqual([0, 1, 2]);
  });

  it('sorts by the column, keeping the arrival order between equals', () => {
    expect(slotsOf(sortPlayers(players, { column: 'kills', direction: 'desc' }))).toEqual([
      1, 0, 2,
    ]);
    expect(slotsOf(sortPlayers(players, { column: 'kills', direction: 'asc' }))).toEqual([0, 2, 1]);
  });

  it('sorts the derived and the indexed columns by what they show', () => {
    expect(slotsOf(sortPlayers(players, { column: 'diff', direction: 'asc' }))).toEqual([2, 0, 1]);
    expect(slotsOf(sortPlayers(players, { column: 'multi5', direction: 'desc' }))).toEqual([
      0, 1, 2,
    ]);
    expect(slotsOf(sortPlayers(players, { column: 'multi2', direction: 'desc' }))).toEqual([
      1, 0, 2,
    ]);
  });
});

describe('PLAYER_COLUMNS', () => {
  it('has one column per id', () => {
    const ids = PLAYER_COLUMNS.map((column) => column.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
