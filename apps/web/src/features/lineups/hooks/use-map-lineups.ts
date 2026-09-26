import type { Lineup } from '@disa/demo-core';
import { parseLineupFile, serializeLineupFile } from '@disa/demo-core';
import { openLineupStore } from '@disa/demo-store';
import { loadMapLineups } from '@disa/map-data';
import { useCallback, useEffect, useState } from 'react';

export function useMapLineups(map: string) {
  const [builtInLineups, setBuiltInLineups] = useState<readonly Lineup[]>([]);
  const [customLineups, setCustomLineups] = useState<readonly Lineup[]>([]);
  const [loadedMap, setLoadedMap] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [builtIn, store] = await Promise.all([loadMapLineups(map), openLineupStore()]);

      setBuiltInLineups(builtIn);

      if (store !== null) {
        try {
          const customs = await store.list({ map });
          setCustomLineups(customs);
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

  const deleteLineup = useCallback(
    async (id: string) => {
      const store = await openLineupStore();
      if (store === null) return;
      try {
        await store.delete(id);
      } finally {
        store.close();
      }
      await reload();
    },
    [reload],
  );

  const importLineups = useCallback(
    async (file: File): Promise<number> => {
      const text = await file.text();
      const parsed = parseLineupFile(text);
      if (parsed.length === 0) return 0;

      const store = await openLineupStore();
      if (store === null) throw new Error('lineup storage is unavailable');
      try {
        await store.putMany(parsed.map((lineup) => ({ ...lineup, isBuiltIn: false })));
      } finally {
        store.close();
      }

      await reload();
      return parsed.length;
    },
    [reload],
  );

  const exportLineups = useCallback(async () => {
    const store = await openLineupStore();
    if (store === null) return;
    let all: readonly Lineup[];
    try {
      all = await store.list();
    } finally {
      store.close();
    }
    const json = serializeLineupFile(all);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'disalytics-lineups.json';
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }, []);

  return {
    lineups: loadedMap === map ? [...customLineups, ...builtInLineups] : [],
    loading: loading || loadedMap !== map,
    reload,
    deleteLineup,
    importLineups,
    exportLineups,
  };
}
