import { openLineupStore } from '@disa/demo-store';
import { loadMapLineups, MAP_IDS } from '@disa/map-data';
import { useEffect, useMemo, useState } from 'react';
import { combineLineups } from '@/core/lineup-catalog';

const NO_COUNTS: ReadonlyMap<string, number> = new Map();

async function readCounts(except: string): Promise<ReadonlyMap<string, number>> {
  const maps = MAP_IDS.filter((map) => map !== except);
  const builtIns = await Promise.all(maps.map(loadMapLineups));
  const store = await openLineupStore();

  if (store === null) return new Map(maps.map((map, index) => [map, builtIns[index]?.length ?? 0]));

  try {
    const stored = await store.list();

    return new Map(
      maps.map((map, index) => [
        map,
        combineLineups(
          stored.filter((lineup) => lineup.map === map),
          builtIns[index] ?? [],
        ).length,
      ]),
    );
  } finally {
    store.close();
  }
}

/**
 * How many lineups each map has, built-ins and the user's own together — what a map's tab says
 * before it is opened. The open map's own count is the live one, so a lineup saved or deleted shows
 * at once; the other maps are read when a map is opened.
 */
export function useLineupMapCounts(
  map: string,
  openCount: number | null,
): ReadonlyMap<string, number> {
  const [others, setOthers] = useState(NO_COUNTS);

  useEffect(() => {
    let isCurrent = true;

    async function refresh() {
      try {
        const read = await readCounts(map);
        if (isCurrent) setOthers(read);
      } catch {
        if (isCurrent) setOthers(NO_COUNTS);
      }
    }

    void refresh();

    return () => {
      isCurrent = false;
    };
  }, [map]);

  return useMemo(() => {
    const counts = new Map(others);
    if (openCount !== null) counts.set(map, openCount);
    return counts;
  }, [others, map, openCount]);
}
