import type { Lineup } from '@disa/demo-core';
import { openLineupStore } from '@disa/demo-store';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { loadOfflineBuiltIns, refreshBuiltIns } from '../helpers/built-ins';
import { combineLineups } from '../helpers/lineup-catalog';

export interface LineupCatalog {
  readonly lineups: readonly Lineup[];
  readonly loading: boolean;
  readonly reload: () => Promise<void>;
}

const NO_LINEUPS: readonly Lineup[] = [];

/**
 * A map's lineups as the user sees them: their own stored ones over the built-ins. The built-ins
 * show at once from the device (last API copy, else the bundled snapshot) and swap to the API's
 * answer when it arrives, so the screen never waits on the network.
 */
export function useLineupCatalog(map: string): LineupCatalog {
  const [builtInLineups, setBuiltInLineups] = useState<readonly Lineup[]>([]);
  const [customLineups, setCustomLineups] = useState<readonly Lineup[]>([]);
  const [loadedMap, setLoadedMap] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const currentMap = useRef(map);
  currentMap.current = map;
  const combinedLineups = useMemo(
    () => combineLineups(customLineups, builtInLineups),
    [customLineups, builtInLineups],
  );

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [builtIn, store] = await Promise.all([loadOfflineBuiltIns(map), openLineupStore()]);

      setBuiltInLineups(builtIn);

      if (store !== null) {
        try {
          setCustomLineups(await store.list({ map }));
        } finally {
          store.close();
        }
      } else {
        setCustomLineups([]);
      }
      setLoadedMap(map);
    } finally {
      setLoading(false);
    }

    void refreshBuiltIns(map).then((fresh) => {
      if (fresh !== null && currentMap.current === map) setBuiltInLineups(fresh);
    });
  }, [map]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    lineups: loadedMap === map ? combinedLineups : NO_LINEUPS,
    loading: loading || loadedMap !== map,
    reload,
  };
}
