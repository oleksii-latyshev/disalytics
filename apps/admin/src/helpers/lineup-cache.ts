import type { Lineup } from '@disa/demo-core';

export interface LineupCache {
  /** The lineups of a map once loaded, otherwise an empty list (and the load is started). */
  /** Forgets every loaded map, so the next read fetches it again. */
  readonly forget: () => void;
  readonly read: (map: string) => readonly Lineup[];
  /** Calls `listener` whenever a map finishes loading; returns the unsubscribe. */
  readonly subscribe: (listener: () => void) => () => void;
}

const NONE: readonly Lineup[] = [];

/**
 * A per-map cache of lineups for the page's lifetime. `read` is cheap and stable: the same array
 * comes back until a load finishes, a map is fetched once, and a failed fetch leaves it empty.
 */
export function makeLineupCache(
  fetchMap: (map: string) => Promise<readonly Lineup[]>,
): LineupCache {
  const loaded = new Map<string, readonly Lineup[]>();
  const pending = new Set<string>();
  const listeners = new Set<() => void>();

  return {
    forget: () => loaded.clear(),
    read: (map) => {
      const known = loaded.get(map);
      if (known !== undefined) return known;
      if (!pending.has(map)) {
        pending.add(map);
        fetchMap(map)
          .then((lineups) => {
            loaded.set(map, lineups);
          })
          .catch(() => {
            loaded.set(map, NONE);
          })
          .finally(() => {
            pending.delete(map);
            for (const listener of listeners) listener();
          });
      }
      return NONE;
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
