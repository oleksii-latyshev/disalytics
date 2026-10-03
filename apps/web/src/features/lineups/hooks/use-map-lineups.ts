import type { Lineup } from '@disa/demo-core';
import { parseLineupFile, referencedLocalImageHashes, serializeLineupFile } from '@disa/demo-core';
import { openLineupStore } from '@disa/demo-store';
import { loadMapLineups } from '@disa/map-data';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { combineLineups, withoutBuiltInCopies } from '../helpers/lineup-catalog';
import { blobToDataUrl, dataUrlToBlob, sha256Hex } from '../helpers/lineup-photo-codec';

async function loadBuiltInsFor(lineups: readonly Lineup[]): Promise<readonly Lineup[]> {
  const maps = [...new Set(lineups.map((lineup) => lineup.map))];
  return (await Promise.all(maps.map(loadMapLineups))).flat();
}

export function useMapLineups(map: string) {
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
      const { lineups: inFile, images } = parseLineupFile(text);
      const parsed = withoutBuiltInCopies(inFile, await loadBuiltInsFor(inFile));
      if (parsed.length === 0) return 0;

      const photos = new Map<string, Blob>();
      for (const [hash, dataUrl] of Object.entries(images)) {
        const blob = dataUrlToBlob(dataUrl);
        if (blob === null || (await sha256Hex(blob)) !== hash) {
          throw new Error(`photo ${hash} does not match its hash`);
        }
        photos.set(hash, blob);
      }

      const store = await openLineupStore();
      if (store === null) throw new Error('lineup storage is unavailable');
      try {
        await store.putPhotos(photos);
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
    const images: Record<string, string> = {};
    try {
      const stored = await store.list();
      all = withoutBuiltInCopies(stored, await loadBuiltInsFor(stored));
      for (const hash of referencedLocalImageHashes(all)) {
        const blob = await store.getPhoto(hash);
        if (blob !== null) images[hash] = await blobToDataUrl(blob);
      }
    } finally {
      store.close();
    }
    const json = serializeLineupFile(all, images);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'disalytics-lineups.json';
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }, []);

  return {
    lineups: loadedMap === map ? combinedLineups : [],
    loading: loading || loadedMap !== map,
    reload,
    deleteLineup,
    importLineups,
    exportLineups,
  };
}
