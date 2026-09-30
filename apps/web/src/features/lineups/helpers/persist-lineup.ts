import type { Lineup } from '@disa/demo-core';
import { openLineupStore } from '@disa/demo-store';

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
