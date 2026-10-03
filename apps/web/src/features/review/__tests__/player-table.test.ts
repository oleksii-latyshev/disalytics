import { asPlayerSlot, type PlayerStats } from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import {
  bestValue,
  nextPlayerSort,
  openingSuccessPercent,
  PLAYER_COLUMNS,
  PLAYER_TABLES,
  type PlayerColumnId,
  sortPlayers,
} from '../helpers/player-table';

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

const column = (id: PlayerColumnId) => {
  const found = PLAYER_COLUMNS.find((entry) => entry.id === id);
  if (found === undefined) throw new Error(id);
  return found;
};

describe('PLAYER_TABLES', () => {
  it('states every column once, across the four tables', () => {
    expect(PLAYER_TABLES.map((table) => table.id)).toEqual([
      'overview',
      'opening',
      'multi',
      'utility',
    ]);
    expect(PLAYER_COLUMNS).toHaveLength(21);
  });
});

describe('openingSuccessPercent', () => {
  it('is kills over the duels taken part in', () => {
    expect(openingSuccessPercent(newStats(0, { openingWon: 3, openingLost: 1 }))).toBe(75);
    expect(openingSuccessPercent(newStats(0, { openingWon: 0, openingLost: 2 }))).toBe(0);
  });

  it('does not exist with no opening duels', () => {
    expect(openingSuccessPercent(newStats(0))).toBeNull();
  });

  it('sorts a player with no duels last in either direction', () => {
    const players = [
      newStats(0),
      newStats(1, { openingWon: 1, openingLost: 1 }),
      newStats(2, { openingWon: 2, openingLost: 0 }),
    ];
    expect(slotsOf(sortPlayers(players, { column: 'openingSuccess', direction: 'desc' }))).toEqual([
      2, 1, 0,
    ]);
    expect(slotsOf(sortPlayers(players, { column: 'openingSuccess', direction: 'asc' }))).toEqual([
      1, 2, 0,
    ]);
  });
});

describe('bestValue', () => {
  const players = [
    newStats(0, { kills: 20, deaths: 10 }),
    newStats(1, { kills: 25, deaths: 15 }),
    newStats(2, { kills: 12, deaths: 18 }),
  ];

  it('is the highest figure where more is better', () => {
    expect(bestValue(players, column('kills'))).toBe(25);
  });

  it('is the lowest figure where fewer is better', () => {
    expect(bestValue(players, column('deaths'))).toBe(10);
    expect(bestValue(players, column('openingDeaths'))).toBeNull();
  });

  it('marks nothing when every player has the same figure', () => {
    expect(bestValue(players, column('clutches'))).toBeNull();
    expect(bestValue([newStats(0, { kills: 4 })], column('kills'))).toBeNull();
  });

  it('ignores a figure that does not exist', () => {
    const duelists = [
      newStats(0),
      newStats(1, { openingWon: 1, openingLost: 1 }),
      newStats(2, { openingWon: 1, openingLost: 0 }),
    ];
    expect(bestValue(duelists, column('openingSuccess'))).toBe(100);
  });
});
