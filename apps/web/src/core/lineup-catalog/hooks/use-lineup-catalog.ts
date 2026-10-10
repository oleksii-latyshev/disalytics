import type { Lineup, LineupCollection } from '@disa/demo-core';
import { openLineupStore } from '@disa/demo-store';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type BuiltInCatalog, loadOfflineCatalog, refreshCatalog } from '../helpers/built-ins';
import { combineLineups } from '../helpers/lineup-catalog';

export interface LineupCatalog {
  readonly lineups: readonly Lineup[];
  /** The API's collections of the map, marked built-in; the user's own are not here. */
  readonly builtInCollections: readonly LineupCollection[];
  readonly loading: boolean;
  readonly reload: () => Promise<void>;
}

const NO_LINEUPS: readonly Lineup[] = [];
const NO_COLLECTIONS: readonly LineupCollection[] = [];
const NOTHING_BUILT_IN: BuiltInCatalog = { lineups: NO_LINEUPS, collections: NO_COLLECTIONS };

/**
 * A map's lineups as the user sees them: their own stored ones over the built-ins, with the
 * built-in collections beside them. The built-ins show at once from the device (last API copy, else
 * the bundled snapshot) and swap to the API's answer when it arrives, so the screen never waits on
 * the network.
 */
export function useLineupCatalog(map: string): LineupCatalog {
  const [builtIn, setBuiltIn] = useState<BuiltInCatalog>(NOTHING_BUILT_IN);
  const [customLineups, setCustomLineups] = useState<readonly Lineup[]>([]);
  const [loadedMap, setLoadedMap] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const currentMap = useRef(map);
  currentMap.current = map;
  const combinedLineups = useMemo(
    () => combineLineups(customLineups, builtIn.lineups),
    [customLineups, builtIn.lineups],
  );

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [offline, store] = await Promise.all([loadOfflineCatalog(map), openLineupStore()]);

      setBuiltIn(offline);

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

    void refreshCatalog(map).then((fresh) => {
      if (fresh !== null && currentMap.current === map) setBuiltIn(fresh);
    });
  }, [map]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    lineups: loadedMap === map ? combinedLineups : NO_LINEUPS,
    builtInCollections: loadedMap === map ? builtIn.collections : NO_COLLECTIONS,
    loading: loading || loadedMap !== map,
    reload,
  };
}
