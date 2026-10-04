import type { PlayerMatchLine } from '@disa/demo-core';
import type { SavedDemo } from '@disa/demo-store';
import { describe, expect, it } from 'vitest';
import { adrByMap, mapsOf, momentsAcross, onMap } from '../helpers/player-profile';

function demo(key: string): SavedDemo {
  return {
    key,
    byteLength: 1,
    lastUsedAt: 1,
    fileName: `${key}.dem`,
    map: 'de_dust2',
    roundCount: 24,
    score: { startedCt: 13, startedT: 11 },
    storedAt: 1,
  };
}

function line(map: string, overrides: Partial<PlayerMatchLine> = {}): PlayerMatchLine {
  const side = { kills: 0, deaths: 0, rounds: 0, roundsWon: 0 };
  return {
    steamId: '76561198000000000',
    name: 'p',
    map,
    openedAs: 'ct',
    result: 'win',
    ownScore: 13,
    opponentScore: 3,
    rounds: 16,
    kills: 10,
    assists: 1,
    deaths: 5,
    damage: 1600,
    headshots: 5,
    kastRounds: 12,
    openingWon: 1,
    openingLost: 1,
    sides: { CT: side, T: side },
    weapons: [],
    multiKillRounds: [0, 0, 0, 0],
    clutches: [],
    multiKills: [],
    ...overrides,
  };
}

const matches = [
  {
    demo: demo('a'),
    line: line('de_dust2', { clutches: [{ roundIndex: 10, kind: 'clutch', count: 2 }] }),
  },
  {
    demo: demo('b'),
    line: line('de_inferno', {
      damage: 800,
      multiKills: [{ roundIndex: 4, kind: 'multi', count: 3 }],
    }),
  },
  {
    demo: demo('c'),
    line: line('de_dust2', { clutches: [{ roundIndex: 2, kind: 'clutch', count: 1 }] }),
  },
];

describe('profile helpers', () => {
  it('lists the maps most played first', () => {
    expect(mapsOf(matches)).toEqual(['de_dust2', 'de_inferno']);
  });

  it('filters by map and keeps everything for null', () => {
    expect(onMap(matches, null)).toHaveLength(3);
    expect(onMap(matches, 'de_inferno').map(({ demo: d }) => d.key)).toEqual(['b']);
  });

  it('weighs damage per round by rounds on each map', () => {
    expect(adrByMap(matches)).toEqual([
      { map: 'de_dust2', adr: 100 },
      { map: 'de_inferno', adr: 50 },
    ]);
  });

  it('names clutches against two or more, then big multi-kill rounds', () => {
    expect(momentsAcross(matches)).toEqual([
      { demoKey: 'a', map: 'de_dust2', roundIndex: 10, kind: 'clutch', count: 2 },
      { demoKey: 'b', map: 'de_inferno', roundIndex: 4, kind: 'multi', count: 3 },
    ]);
  });
});
