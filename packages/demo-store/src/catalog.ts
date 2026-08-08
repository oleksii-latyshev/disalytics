import { schemaVersionOf } from './fingerprint';
import { isRecord } from './guards';

export interface CatalogEntry {
  key: string;
  byteLength: number;
  lastUsedAt: number;
}

export const CATALOG_NAME = 'catalog.json';

/**
 * The eviction policy, in one place so it is read rather than inferred:
 *
 * - the cache holds at most `CACHE_BYTE_LIMIT` bytes of demos, counted from what was written;
 * - over that, the least recently used entry goes first, and then the next, until it fits;
 * - the entry being written is never the one evicted, so a demo larger than the whole cap is kept
 *   rather than written and deleted in the same breath;
 * - an entry whose key names another `SCHEMA_VERSION` is dropped on open — the key already made it
 *   unreachable, and this is what stops it holding space forever;
 * - a file with no entry is an interrupted write and is dropped on open for the same reason.
 *
 * Eviction runs on write only. A read never deletes anything, and never writes the catalog either:
 * recency is kept in memory for the session and flushed the next time a demo is stored, which is
 * the only moment it can change what gets evicted.
 */
export const CACHE_BYTE_LIMIT = 512 * 1024 * 1024;

function isEntry(value: unknown): value is CatalogEntry {
  return (
    isRecord(value) &&
    typeof value.key === 'string' &&
    typeof value.byteLength === 'number' &&
    typeof value.lastUsedAt === 'number'
  );
}

/** A catalog that cannot be read is an empty one: the files it described are pruned as orphans. */
export function parseCatalog(bytes: Uint8Array<ArrayBuffer>): CatalogEntry[] {
  try {
    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));

    return Array.isArray(parsed) ? parsed.filter(isEntry) : [];
  } catch {
    return [];
  }
}

export function serialiseCatalog(entries: readonly CatalogEntry[]): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(JSON.stringify(entries));
}

export function withEntry(
  entries: readonly CatalogEntry[],
  entry: CatalogEntry,
): readonly CatalogEntry[] {
  return [...entries.filter((existing) => existing.key !== entry.key), entry];
}

export function withoutKeys(
  entries: readonly CatalogEntry[],
  dropped: readonly string[],
): readonly CatalogEntry[] {
  return entries.filter((entry) => !dropped.includes(entry.key));
}

export function totalBytes(entries: readonly CatalogEntry[]): number {
  return entries.reduce((total, entry) => total + entry.byteLength, 0);
}

/** The key is the tiebreaker, so two entries used in the same millisecond still evict in an order. */
function leastRecentlyUsedFirst(entries: readonly CatalogEntry[]): CatalogEntry[] {
  return [...entries].sort(
    (left, right) => left.lastUsedAt - right.lastUsedAt || left.key.localeCompare(right.key),
  );
}

export function overflowingKeys(
  entries: readonly CatalogEntry[],
  limit: number,
  keep: string,
): readonly string[] {
  const dropped: string[] = [];
  let remaining = totalBytes(entries);

  for (const entry of leastRecentlyUsedFirst(entries)) {
    if (remaining <= limit) break;
    if (entry.key === keep) continue;

    dropped.push(entry.key);
    remaining -= entry.byteLength;
  }

  return dropped;
}

export function staleKeys(
  entries: readonly CatalogEntry[],
  schemaVersion: number,
): readonly string[] {
  return entries
    .filter((entry) => schemaVersionOf(entry.key) !== schemaVersion)
    .map((entry) => entry.key);
}
