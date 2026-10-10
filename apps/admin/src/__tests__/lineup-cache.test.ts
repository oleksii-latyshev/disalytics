import type { Lineup } from '@disa/demo-core';
import { describe, expect, it, vi } from 'vitest';
import { makeLineupCache } from '../helpers/lineup-cache';
import { lineup } from './support';

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('makeLineupCache', () => {
  it('is empty while loading, fetches a map once and tells listeners when it arrives', async () => {
    const fetchMap = vi.fn(async (map: string): Promise<readonly Lineup[]> => [lineup({ map })]);
    const cache = makeLineupCache(fetchMap);
    const listener = vi.fn();
    cache.subscribe(listener);

    const first = cache.read('de_mirage');
    expect(first).toEqual([]);
    expect(cache.read('de_mirage')).toBe(first);
    await settle();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(cache.read('de_mirage')).toHaveLength(1);
    expect(cache.read('de_mirage')).toBe(cache.read('de_mirage'));
    expect(fetchMap).toHaveBeenCalledTimes(1);
  });

  it('fetches a map again after forget', async () => {
    const fetchMap = vi.fn(async (map: string): Promise<readonly Lineup[]> => [lineup({ map })]);
    const cache = makeLineupCache(fetchMap);
    cache.read('de_mirage');
    await settle();
    cache.forget();
    expect(cache.read('de_mirage')).toEqual([]);
    await settle();
    expect(fetchMap).toHaveBeenCalledTimes(2);
  });

  it('keeps maps apart and does not retry a failed map forever', async () => {
    const fetchMap = vi.fn(async (map: string): Promise<readonly Lineup[]> => {
      if (map === 'de_nuke') throw new Error('offline');
      return [lineup({ map })];
    });
    const cache = makeLineupCache(fetchMap);
    cache.read('de_nuke');
    cache.read('de_dust2');
    await settle();
    expect(cache.read('de_nuke')).toEqual([]);
    expect(cache.read('de_dust2')[0]?.map).toBe('de_dust2');
    await settle();
    expect(fetchMap).toHaveBeenCalledTimes(2);
  });
});
