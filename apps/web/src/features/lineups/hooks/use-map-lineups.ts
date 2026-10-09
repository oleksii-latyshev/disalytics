import type { Lineup, LineupCollection } from '@disa/demo-core';
import {
  collectionsToImport,
  parseLineupFile,
  referencedLocalImageHashes,
  serializeLineupFile,
} from '@disa/demo-core';
import { openLineupStore } from '@disa/demo-store';
import { useCallback } from 'react';
import { loadBuiltInsFor, useLineupCatalog, withoutBuiltInCopies } from '@/core/lineup-catalog';
import { blobToDataUrl, dataUrlToBlob, sha256Hex } from '../helpers/lineup-photo-codec';

export interface ImportResult {
  readonly lineups: number;
  readonly collections: number;
}

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
    async (file: File): Promise<ImportResult> => {
      const text = await file.text();
      const { lineups: inFile, images, collections } = parseLineupFile(text);
      const parsed = withoutBuiltInCopies(inFile, await loadBuiltInsFor(inFile));
      if (parsed.length === 0 && collections.length === 0) return { lineups: 0, collections: 0 };

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
      let written: readonly LineupCollection[];
      try {
        await store.putPhotos(photos);
        await store.putMany(parsed.map((lineup) => ({ ...lineup, isBuiltIn: false })));
        written = collectionsToImport(await store.listCollections(), collections);
        await store.putCollections(written);
      } finally {
        store.close();
      }

      await reload();
      return { lineups: parsed.length, collections: written.length };
    },
    [reload],
  );

  /** Saves the user's own lineups of this map, with their photos, as a file. */
  const exportLineups = useCallback(async () => {
    const store = await openLineupStore();
    if (store === null) return;
    let own: readonly Lineup[];
    let collections: readonly LineupCollection[];
    const images: Record<string, string> = {};
    try {
      const stored = await store.list({ map });
      own = withoutBuiltInCopies(stored, await loadBuiltInsFor(stored));
      collections = await store.listCollections(map);
      for (const hash of referencedLocalImageHashes(own)) {
        const blob = await store.getPhoto(hash);
        if (blob !== null) images[hash] = await blobToDataUrl(blob);
      }
    } finally {
      store.close();
    }
    const json = serializeLineupFile(own, images, collections);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `disalytics-lineups-${map}.json`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }, [map]);

  return {
    lineups,
    loading,
    reload,
    deleteLineup,
    importLineups,
    exportLineups,
  };
}
