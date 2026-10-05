import { asPlayerSlot, type PlayerStats } from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import {
  BEST_CARDS,
  barScale,
  bestHolders,
  bestValue,
  openingSuccessPercent,
  PLAYER_COLUMN_SETS,
  PLAYER_COLUMNS,
  type PlayerColumnId,
  sortByRating,
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

describe('sortByRating', () => {
  it('puts the best rating first and keeps the arrival order between equals', () => {
    const players = [
      newStats(0, { rating: 0.9 }),
      newStats(1, { rating: 1.3 }),
      newStats(2, { rating: 0.9 }),
    ];
    expect(slotsOf(sortByRating(players))).toEqual([1, 0, 2]);
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

describe('PLAYER_COLUMN_SETS', () => {
  it('states every column once, across the four sets', () => {
    expect(PLAYER_COLUMN_SETS.map((set) => set.id)).toEqual(['main', 'duels', 'multi', 'utility']);
    expect(PLAYER_COLUMNS).toHaveLength(21);
  });

  it('draws a bar for the rating and the utility damage only', () => {
    expect(PLAYER_COLUMNS.filter((entry) => entry.bar).map((entry) => entry.id)).toEqual([
      'rating',
      'utilityDamage',
    ]);
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

describe('bestHolders', () => {
  it('names everyone who holds the best figure, in the order given', () => {
    const players = [
      newStats(0, { kills: 25 }),
      newStats(1, { kills: 12 }),
      newStats(2, { kills: 25 }),
    ];
    expect(bestHolders(players, column('kills'))).toEqual({ value: 25, slots: [0, 2] });
  });

  it('names nobody where nothing stands out', () => {
    expect(bestHolders([newStats(0), newStats(1)], column('kills'))).toBeNull();
  });
});

describe('barScale', () => {
  it('is the largest figure, and 0 when there is none', () => {
    const players = [newStats(0, { utilityDamage: 40 }), newStats(1, { utilityDamage: 90 })];
    expect(barScale(players, column('utilityDamage'))).toBe(90);
    expect(barScale([], column('utilityDamage'))).toBe(0);
  });
});

describe('BEST_CARDS', () => {
  it('leads with the rating and has a card per figure', () => {
    expect(BEST_CARDS.map((card) => card.column.id)).toEqual([
      'rating',
      'kills',
      'adr',
      'openingKills',
      'utilityDamage',
      'kast',
    ]);
  });
});
