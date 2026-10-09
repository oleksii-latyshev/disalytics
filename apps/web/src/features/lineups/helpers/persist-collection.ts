import type { LineupCollection } from '@disa/demo-core';
import { openLineupStore } from '@disa/demo-store';

/** A map's collections; empty when the store is unavailable, which is a miss and not an error. */
export async function loadCollections(map: string): Promise<readonly LineupCollection[]> {
  try {
    const store = await openLineupStore();
    if (store === null) return [];
    try {
      return await store.listCollections(map);
    } finally {
      store.close();
    }
  } catch {
    return [];
  }
}

/** Saves the collections in one transaction; `false` when the store is unavailable or refuses. */
export async function persistCollections(
  collections: readonly LineupCollection[],
): Promise<boolean> {
  try {
    const store = await openLineupStore();
    if (store === null) return false;
    try {
      await store.putCollections(collections);
      return true;
    } finally {
      store.close();
    }
  } catch {
    return false;
  }
}

export async function removeCollection(id: string): Promise<boolean> {
  try {
    const store = await openLineupStore();
    if (store === null) return false;
    try {
      await store.deleteCollection(id);
      return true;
    } finally {
      store.close();
    }
  } catch {
    return false;
  }
}
