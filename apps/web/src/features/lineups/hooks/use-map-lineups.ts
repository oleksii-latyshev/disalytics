import type { Lineup } from '@disa/demo-core';
import { parseLineupFile, referencedLocalImageHashes, serializeLineupFile } from '@disa/demo-core';
import { openLineupStore } from '@disa/demo-store';
import { useCallback } from 'react';
import { loadBuiltInsFor, useLineupCatalog, withoutBuiltInCopies } from '@/core/lineups';
import { blobToDataUrl, dataUrlToBlob, sha256Hex } from '../helpers/lineup-photo-codec';

export function useMapLineups(map: string) {
  const { lineups, loading, reload } = useLineupCatalog(map);

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
    lineups,
    loading,
    reload,
    deleteLineup,
    importLineups,
    exportLineups,
  };
}
