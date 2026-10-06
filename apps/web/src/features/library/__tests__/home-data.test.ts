import type { Tactic } from '@disa/demo-core';
import type { SavedDemo } from '@disa/demo-store';
import { describe, expect, it } from 'vitest';
import { formatReading, parseReading } from '../helpers/home-reading';
import { lastMatchOf, mergeRecent } from '../helpers/home-recent';
import { parseSteamId } from '../helpers/steam-id';

function demo(key: string, storedAt: number): SavedDemo {
  return {
    key,
    byteLength: 1,
    lastUsedAt: storedAt,
    fileName: `${key}.dem`,
    map: 'de_dust2',
    roundCount: 24,
    score: { startedCt: 13, startedT: 11 },
    storedAt,
  };
}

function tactic(id: string, updatedAt: number): Tactic {
  return {
    id,
    title: id,
    map: 'de_mirage',
    side: 'T',
    spawns: [],
    plans: [{ id: 'main', condition: id, parentId: null, forkAfter: 0, deaths: {}, steps: [] }],
    createdAt: updatedAt,
    updatedAt,
  };
}

describe('parseSteamId', () => {
  it('takes the number, with spaces around it', () => {
    expect(parseSteamId('  76561198246607476 ')).toEqual({
      kind: 'ok',
      steamId: '76561198246607476',
    });
  });

  it('takes a profiles link', () => {
    expect(parseSteamId('https://steamcommunity.com/profiles/76561198246607476/')).toEqual({
      kind: 'ok',
      steamId: '76561198246607476',
    });
  });

  it('names a vanity link as one rather than as a typo', () => {
    expect(parseSteamId('https://steamcommunity.com/id/b1t')).toEqual({ kind: 'vanity' });
  });

  it('refuses anything else, including a number that is too long or too short', () => {
    expect(parseSteamId('b1t')).toEqual({ kind: 'format' });
    expect(parseSteamId('7656119824660747')).toEqual({ kind: 'format' });
    expect(parseSteamId('765611982466074761')).toEqual({ kind: 'format' });
  });
});

describe('reading position', () => {
  it('round-trips', () => {
    const reading = { key: 'abc:8', round: 12, at: 5 };

    expect(parseReading(formatReading(reading))).toEqual(reading);
  });

  it('is nothing for what it cannot trust', () => {
    expect(parseReading('')).toBeNull();
    expect(parseReading('nope')).toBeNull();
    expect(parseReading('{"key":"a","round":0,"at":1}')).toBeNull();
    expect(parseReading('{"key":"","round":2,"at":1}')).toBeNull();
    expect(parseReading('{"key":"a","round":2.5,"at":1}')).toBeNull();
  });
});

describe('lastMatchOf', () => {
  const demos = [demo('old', 1), demo('new', 9), demo('mid', 5)];

  it('is the match the reader was in, if it is still saved', () => {
    expect(lastMatchOf(demos, { key: 'mid', round: 3, at: 1 })?.key).toBe('mid');
  });

  it('is the newest saved match when the reading points at nothing', () => {
    expect(lastMatchOf(demos, { key: 'gone', round: 3, at: 1 })?.key).toBe('new');
    expect(lastMatchOf(demos, null)?.key).toBe('new');
  });

  it('is nothing on a first run', () => {
    expect(lastMatchOf([], null)).toBeNull();
  });
});

describe('mergeRecent', () => {
  it('interleaves matches and tactics newest first and stops at the limit', () => {
    const merged = mergeRecent(
      [demo('a', 10), demo('b', 2)],
      [tactic('t1', 7), tactic('t2', 1)],
      3,
    );

    expect(merged.map((item) => item.at)).toEqual([10, 7, 2]);
    expect(merged.map((item) => item.kind)).toEqual(['match', 'tactic', 'match']);
  });
});
