import type { Lineup } from '@disa/demo-core';
import { parseLineupFile, serializeLineupFile } from '@disa/demo-core';
import { openLineupStore } from '@disa/demo-store';
import { loadMapLineups } from '@disa/map-data';
import { useCallback, useEffect, useState } from 'react';

export function useMapLineups(map: string) {
  const [builtInLineups, setBuiltInLineups] = useState<readonly Lineup[]>([]);
  const [customLineups, setCustomLineups] = useState<readonly Lineup[]>([]);
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
      if (store === null) return 0;
      try {
        await store.putMany(parsed);
      } finally {
        store.close();
      }

      await reload();
      return parsed.length;
    },
    [reload],
  );

  const exportLineups = useCallback(() => {
    const all = [...customLineups, ...builtInLineups];
    const json = serializeLineupFile(all);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `disalytics-lineups-${map}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [map, customLineups, builtInLineups]);

  return {
    lineups: [...customLineups, ...builtInLineups],
    loading,
    reload,
    deleteLineup,
    importLineups,
    exportLineups,
  };
}
