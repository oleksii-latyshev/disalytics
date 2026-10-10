import { openLineupStore } from '@disa/demo-store';
import { MAP_IDS } from '@disa/map-data';
import { useEffect, useMemo, useState } from 'react';
import { combineLineups, loadOfflineBuiltIns, syncBuiltIns } from '@/core/lineup-catalog';

const NO_COUNTS: ReadonlyMap<string, number> = new Map();

async function readCounts(maps: readonly string[]): Promise<ReadonlyMap<string, number>> {
  const builtIns = await Promise.all(maps.map(loadOfflineBuiltIns));
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

/** The counts from the device at once, then again if the API had newer copies to store. */
async function publishCounts(
  maps: readonly string[],
  publish: (counts: ReadonlyMap<string, number>) => void,
): Promise<void> {
  publish(await readCounts(maps));
  if ((await syncBuiltIns(maps)).length > 0) publish(await readCounts(maps));
}

/**
 * How many lineups each map has, built-ins and the user's own together — what a map's tab says
 * before it is opened. The open map's own count is the live one, so a lineup saved or deleted shows
 * at once. The other maps are counted from what is on the device first, then again once the API's
 * newer copies, if any, have been stored; offline, the first count stands.
 */
export function useLineupMapCounts(
  map: string,
  openCount: number | null,
): ReadonlyMap<string, number> {
  const [others, setOthers] = useState(NO_COUNTS);

  useEffect(() => {
    let isCurrent = true;

    const maps = MAP_IDS.filter((id) => id !== map);

    async function refresh() {
      try {
        await publishCounts(maps, (counts) => {
          if (isCurrent) setOthers(counts);
        });
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
