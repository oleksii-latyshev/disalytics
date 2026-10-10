import {
  isLineup,
  isLineupCollection,
  type Lineup,
  type LineupCollection,
  normalizeLineup,
} from '@disa/demo-core';
import { openBuiltInLineupStore, type StoredBuiltInLineups } from '@disa/demo-store';
import { loadMapLineups } from '@disa/map-data';

const DEFAULT_API_URL = 'https://disalytics-api.disa-67b.workers.dev';
const FETCH_TIMEOUT_MS = 6000;

/** Where the API is: `VITE_DISALYTICS_API_URL`, else production. */
export function apiUrl(): string {
  const configured: unknown = import.meta.env.VITE_DISALYTICS_API_URL;
  return typeof configured === 'string' && configured !== '' ? configured : DEFAULT_API_URL;
}

type Fetch = (input: string, init?: { readonly signal?: AbortSignal }) => Promise<Response>;

function asBuiltIn(map: string, entries: readonly unknown[]): Lineup[] {
  return entries
    .map((entry) =>
      typeof entry === 'object' && entry !== null ? { ...entry, isBuiltIn: true } : entry,
    )
    .filter(isLineup)
    .map(normalizeLineup)
    .filter((lineup) => lineup.map === map);
}

/** A map's built-in lineups and collections, as one copy of them. */
export interface BuiltInCatalog {
  readonly lineups: readonly Lineup[];
  readonly collections: readonly LineupCollection[];
}

function asBuiltInCollections(map: string, entries: readonly unknown[]): LineupCollection[] {
  return entries
    .map((entry) =>
      typeof entry === 'object' && entry !== null ? { ...entry, isBuiltIn: true } : entry,
    )
    .filter(isLineupCollection)
    .filter((collection) => collection.map === map);
}

/**
 * The API's lineups for a map, or `null` when it cannot be reached, answers badly, or has never
 * been seeded (revision 0) — the caller then keeps what it has.
 */
export async function fetchBuiltIns(
  map: string,
  fetchImpl: Fetch = (input, init) => fetch(input, init),
): Promise<StoredBuiltInLineups | null> {
  try {
    const response = await fetchImpl(`${apiUrl()}/lineups/${encodeURIComponent(map)}`, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    const body: unknown = await response.json();
    if (
      typeof body !== 'object' ||
      body === null ||
      !('revision' in body) ||
      typeof body.revision !== 'number' ||
      body.revision < 1 ||
      !('lineups' in body) ||
      !Array.isArray(body.lineups)
    ) {
      return null;
    }
    return {
      revision: body.revision,
      lineups: asBuiltIn(map, body.lineups),
      collections:
        'collections' in body && Array.isArray(body.collections)
          ? asBuiltInCollections(map, body.collections)
          : [],
    };
  } catch {
    return null;
  }
}

async function readStored(map: string): Promise<StoredBuiltInLineups | null> {
  const store = await openBuiltInLineupStore();
  if (store === null) return null;
  try {
    return await store.get(map);
  } catch {
    return null;
  } finally {
    store.close();
  }
}

async function writeStored(map: string, copy: StoredBuiltInLineups): Promise<void> {
  const store = await openBuiltInLineupStore();
  if (store === null) return;
  try {
    await store.put(map, copy);
  } catch {
    // a cache that cannot be written only costs the next offline start
  } finally {
    store.close();
  }
}

/** What is on the device: the last copy the API sent, else the snapshot bundled with the app. */
export async function loadOfflineCatalog(map: string): Promise<BuiltInCatalog> {
  const stored = await readStored(map);
  if (stored === null) return { lineups: await loadMapLineups(map), collections: [] };
  return { lineups: stored.lineups, collections: stored.collections };
}

/** Fetches the API's copy and keeps it for the next offline start; `null` leaves the caller as is. */
export async function refreshCatalog(
  map: string,
  fetchImpl?: Fetch,
): Promise<BuiltInCatalog | null> {
  const fresh = await fetchBuiltIns(map, fetchImpl);
  if (fresh === null) return null;
  await writeStored(map, fresh);
  return { lineups: fresh.lineups, collections: fresh.collections };
}

export async function loadOfflineBuiltIns(map: string): Promise<readonly Lineup[]> {
  return (await loadOfflineCatalog(map)).lineups;
}

/** The API's lineups when reachable, else what is on the device. */
export async function loadBuiltIns(map: string): Promise<readonly Lineup[]> {
  return ((await refreshCatalog(map)) ?? (await loadOfflineCatalog(map))).lineups;
}

/** The newest revision the API holds for each map it has seeded, or `null` when it cannot be reached. */
export async function fetchRevisions(
  fetchImpl: Fetch = (input, init) => fetch(input, init),
): Promise<ReadonlyMap<string, number> | null> {
  try {
    const response = await fetchImpl(`${apiUrl()}/lineups`, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    const body: unknown = await response.json();
    if (
      typeof body !== 'object' ||
      body === null ||
      !('maps' in body) ||
      !Array.isArray(body.maps)
    ) {
      return null;
    }
    const revisions = new Map<string, number>();
    for (const entry of body.maps as readonly unknown[]) {
      if (
        typeof entry === 'object' &&
        entry !== null &&
        'map' in entry &&
        typeof entry.map === 'string' &&
        'revision' in entry &&
        typeof entry.revision === 'number'
      ) {
        revisions.set(entry.map, entry.revision);
      }
    }
    return revisions;
  } catch {
    return null;
  }
}

/**
 * Brings the stored copy of each of `maps` up to what the API holds: a map whose revision there is
 * newer than the stored one (or that has no stored copy) is fetched and kept. Resolves with the
 * maps that changed; nothing changes, quietly, when the API cannot be reached.
 */
export async function syncBuiltIns(
  maps: readonly string[],
  fetchImpl?: Fetch,
): Promise<readonly string[]> {
  const revisions = await fetchRevisions(fetchImpl);
  if (revisions === null) return [];
  const stale: string[] = [];
  for (const map of maps) {
    const remote = revisions.get(map);
    if (remote === undefined || remote < 1) continue;
    const stored = await readStored(map);
    if (stored === null || stored.revision < remote) stale.push(map);
  }
  const refreshed = await Promise.all(
    stale.map(async (map) => ((await refreshCatalog(map, fetchImpl)) === null ? null : map)),
  );
  return refreshed.filter((map) => map !== null);
}
