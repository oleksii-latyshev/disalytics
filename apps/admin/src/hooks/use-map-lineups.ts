import type { Lineup } from '@disa/demo-core';
import { isLineup } from '@disa/demo-core';
import { useSyncExternalStore } from 'react';
import { call } from '../api/client';
import { type LineupCache, makeLineupCache } from '../helpers/lineup-cache';

const cache: LineupCache = makeLineupCache(async (map) => {
  const { lineups } = await call((client) => client.lineups.byMap({ params: { map } }));
  return lineups.filter(isLineup);
});

/** Drops what was loaded, so the lineups imported since are fetched again. */
export function forgetMapLineups(): void {
  cache.forget();
}

/** The site's lineups of a map for the tactic editor's throws; empty while they load. */
export function useMapLineups(map: string): readonly Lineup[] {
  return useSyncExternalStore(
    cache.subscribe,
    () => cache.read(map),
    () => cache.read(map),
  );
}
