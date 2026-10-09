import type { Lineup } from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import {
  mergeLineups,
  ungroupLineups,
  withBounce,
  withoutBounce,
} from '../helpers/lineup-group-edit';

const lineup = (id: string, patch: Partial<Lineup> = {}): Lineup => ({
  id,
  title: id,
  map: 'de_mirage',
  side: 'T',
  kind: 'smoke',
  origin: { x: 10, y: 20, z: 0 },
  landing: { x: 100, y: 200, z: 0 },
  pitch: 0,
  yaw: 0,
  throwType: 'stand',
  movementKeys: [],
  movementKeysSummary: '',
  command: '',
  createdAt: 1,
  isBuiltIn: true,
  ...patch,
});

describe('mergeLineups', () => {
  const pair = [
    lineup('a'),
    lineup('b', { origin: { x: 50, y: 60, z: 0 }, landing: { x: 300, y: 400, z: 0 } }),
  ];

  it('gives the lineups the first one landing, and makes them the user own', () => {
    const merged = mergeLineups(pair, 'landing', 'g1');

    expect(merged.map((item) => item.landing)).toEqual([pair[0]?.landing, pair[0]?.landing]);
    expect(merged.map((item) => item.origin)).toEqual([pair[0]?.origin, pair[1]?.origin]);
    expect(merged.every((item) => item.groupId === 'g1' && item.originGroupId === undefined)).toBe(
      true,
    );
    expect(merged.every((item) => item.isBuiltIn === false)).toBe(true);
  });

  it('gives them the first one throw spot when merging origins', () => {
    const merged = mergeLineups(pair, 'origin', 'g1');

    expect(merged.map((item) => item.origin)).toEqual([pair[0]?.origin, pair[0]?.origin]);
    expect(merged.map((item) => item.landing)).toEqual([pair[0]?.landing, pair[1]?.landing]);
  });

  it('sets only the origin group, leaving the landing group alone', () => {
    const landed = pair.map((item) => ({ ...item, groupId: 'land' }));
    const merged = mergeLineups(landed, 'origin', 'g2');

    expect(merged.every((item) => item.originGroupId === 'g2' && item.groupId === 'land')).toBe(
      true,
    );
    expect(merged.every((item) => item.groupTarget === undefined)).toBe(true);
  });

  it('keeps an origin group when merging landings', () => {
    const merged = mergeLineups(
      pair.map((item) => ({ ...item, originGroupId: 'org' })),
      'landing',
      'g3',
    );

    expect(merged.every((item) => item.originGroupId === 'org' && item.groupId === 'g3')).toBe(
      true,
    );
  });

  it('merges nothing from fewer than two', () => {
    expect(mergeLineups([lineup('a')], 'landing', 'g1')).toEqual([]);
  });
});

describe('ungroupLineups', () => {
  const lineups = [
    lineup('a', { groupId: 'g', originGroupId: 'o' }),
    lineup('b', { groupId: 'g' }),
    lineup('c', { groupId: 'other' }),
    lineup('d', { originGroupId: 'o' }),
    lineup('e'),
  ];

  it('takes the whole landing group out and keeps the origin group', () => {
    const freed = ungroupLineups(lineups, new Set(['a', 'e']), 'landing');

    expect(freed.map((item) => item.id)).toEqual(['a', 'b']);
    expect(freed.every((item) => item.groupId === undefined)).toBe(true);
    expect(freed.find((item) => item.id === 'a')?.originGroupId).toBe('o');
  });

  it('takes the whole origin group out and keeps the landing group', () => {
    const freed = ungroupLineups(lineups, new Set(['d']), 'origin');

    expect(freed.map((item) => item.id)).toEqual(['a', 'd']);
    expect(freed.every((item) => item.originGroupId === undefined)).toBe(true);
    expect(freed.find((item) => item.id === 'a')?.groupId).toBe('g');
  });
});

describe('bounces', () => {
  it('adds one halfway between the last point of the throw and the landing', () => {
    const first = withBounce(lineup('a'));
    expect(first.waypoints).toEqual([{ x: 55, y: 110, z: 0 }]);

    const second = withBounce(first);
    expect(second.waypoints?.[1]).toEqual({ x: 77.5, y: 155, z: 0 });
    expect(second.isBuiltIn).toBe(false);
  });

  it('removes the one asked for', () => {
    const bounced = withBounce(withBounce(lineup('a')));

    expect(withoutBounce(bounced, 0).waypoints).toEqual([bounced.waypoints?.[1]]);
  });
});
