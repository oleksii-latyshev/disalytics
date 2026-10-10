import { isTactic, type Tactic } from '@disa/demo-core';
import { type BuiltInTactics, openBuiltInTacticStore } from '@disa/demo-store';
import { apiUrl } from '@/core/lineup-catalog';
import { defaultTactics } from './default-tactics';

const FETCH_TIMEOUT_MS = 6000;

type Fetch = (input: string, init?: { readonly signal?: AbortSignal }) => Promise<Response>;

/**
 * The API's tactics, or `null` when it cannot be reached, answers badly, or has never been seeded
 * (revision 0) — the caller then keeps what it has.
 */
export async function fetchBuiltInTactics(
  fetchImpl: Fetch = (input, init) => fetch(input, init),
): Promise<BuiltInTactics | null> {
  try {
    const response = await fetchImpl(`${apiUrl()}/tactics`, {
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
      !('tactics' in body) ||
      !Array.isArray(body.tactics)
    ) {
      return null;
    }
    return { revision: body.revision, tactics: body.tactics.filter(isTactic) };
  } catch {
    return null;
  }
}

async function readStored(): Promise<BuiltInTactics | null> {
  const store = await openBuiltInTacticStore();
  if (store === null) return null;
  try {
    return await store.get();
  } catch {
    return null;
  } finally {
    store.close();
  }
}

async function writeStored(copy: BuiltInTactics): Promise<void> {
  const store = await openBuiltInTacticStore();
  if (store === null) return;
  try {
    await store.put(copy);
  } catch {
    // a cache that cannot be written only costs the next offline start
  } finally {
    store.close();
  }
}

/** What is on the device: the last copy the API sent, else the tactics bundled with the app. */
export async function loadOfflineTactics(): Promise<readonly Tactic[]> {
  const stored = await readStored();
  return stored === null ? defaultTactics() : stored.tactics;
}

/** Fetches the API's copy and keeps it for the next offline start; `null` leaves the caller as is. */
export async function refreshBuiltInTactics(fetchImpl?: Fetch): Promise<readonly Tactic[] | null> {
  const fresh = await fetchBuiltInTactics(fetchImpl);
  if (fresh === null) return null;
  await writeStored(fresh);
  return fresh.tactics;
}

/**
 * The built-ins the reader can see: a tactic the reader's own library holds under the same id is
 * theirs (possibly edited), so the built-in of that id steps aside.
 */
export function visibleBuiltIns(
  builtIns: readonly Tactic[],
  own: readonly Tactic[],
): readonly Tactic[] {
  const owned = new Set(own.map(({ id }) => id));
  return builtIns.filter(({ id }) => !owned.has(id));
}
