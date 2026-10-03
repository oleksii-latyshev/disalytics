import type { Lineup } from '@disa/demo-core';
import { openLineupStore } from '@disa/demo-store';
import { hashedLocalRef } from './lineup-photo-codec';
import type { PreparedImage } from './prepared-image';

export async function persistLineup(lineup: Lineup): Promise<boolean> {
  try {
    const store = await openLineupStore();
    if (store === null) return false;
    try {
      await store.put(lineup);
      return true;
    } finally {
      store.close();
    }
  } catch {
    return false;
  }
}

/** Stores prepared photos on this device; returns their `local:` refs in order, or null on failure. */
export async function storePreparedPhotos(
  images: readonly PreparedImage[],
): Promise<readonly string[] | null> {
  try {
    const hashed = await Promise.all(
      images.map(async (image) => ({ ...(await hashedLocalRef(image.file)), blob: image.file })),
    );
    const store = await openLineupStore();
    if (store === null) return null;
    try {
      await store.putPhotos(new Map(hashed.map(({ hash, blob }) => [hash, blob])));
      return hashed.map(({ ref }) => ref);
    } finally {
      store.close();
    }
  } catch {
    return null;
  }
}
