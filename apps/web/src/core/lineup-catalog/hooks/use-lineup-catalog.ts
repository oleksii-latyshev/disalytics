import type { Lineup } from '@disa/demo-core';
import { openLineupStore } from '@disa/demo-store';
import { loadMapLineups } from '@disa/map-data';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { combineLineups } from '../helpers/lineup-catalog';

export interface LineupCatalog {
  readonly lineups: readonly Lineup[];
  readonly loading: boolean;
  readonly reload: () => Promise<void>;
}

const NO_LINEUPS: readonly Lineup[] = [];

/** A map's lineups as the user sees them: their own stored ones over the bundled built-ins. */
export function useLineupCatalog(map: string): LineupCatalog {
  const [builtInLineups, setBuiltInLineups] = useState<readonly Lineup[]>([]);
  const [customLineups, setCustomLineups] = useState<readonly Lineup[]>([]);
  const [loadedMap, setLoadedMap] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const combinedLineups = useMemo(
    () => combineLineups(customLineups, builtInLineups),
    [customLineups, builtInLineups],
  );

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [builtIn, store] = await Promise.all([loadMapLineups(map), openLineupStore()]);

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
