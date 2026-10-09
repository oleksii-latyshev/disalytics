import { isLineup, type Lineup } from '@disa/demo-core';
import { type BuiltInLineups, openBuiltInLineupStore } from '@disa/demo-store';
import { loadMapLineups } from '@disa/map-data';

const DEFAULT_API_URL = 'https://disalytics-api.disa-67b.workers.dev';
const FETCH_TIMEOUT_MS = 6000;

function apiUrl(): string {
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
    .filter((lineup) => lineup.map === map);
}

/**
 * The API's lineups for a map, or `null` when it cannot be reached, answers badly, or has never
 * been seeded (revision 0) — the caller then keeps what it has.
 */
export async function fetchBuiltIns(
  map: string,
  fetchImpl: Fetch = (input, init) => fetch(input, init),
): Promise<BuiltInLineups | null> {
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
    return { revision: body.revision, lineups: asBuiltIn(map, body.lineups) };
  } catch {
    return null;
  }
}

async function readStored(map: string): Promise<BuiltInLineups | null> {
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

async function writeStored(map: string, copy: BuiltInLineups): Promise<void> {
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
export async function loadOfflineBuiltIns(map: string): Promise<readonly Lineup[]> {
  const stored = await readStored(map);
  return stored === null ? loadMapLineups(map) : stored.lineups;
}

/** Fetches the API's copy and keeps it for the next offline start; `null` leaves the caller as is. */
export async function refreshBuiltIns(map: string): Promise<readonly Lineup[] | null> {
  const fresh = await fetchBuiltIns(map);
  if (fresh === null) return null;
  await writeStored(map, fresh);
  return fresh.lineups;
}

/** The API's lineups when reachable, else what is on the device. */
export async function loadBuiltIns(map: string): Promise<readonly Lineup[]> {
  return (await refreshBuiltIns(map)) ?? loadOfflineBuiltIns(map);
}
