import type { MatchScore, OpeningSide } from '@disa/demo-core';
import { schemaVersionOf } from './fingerprint';
import { isRecord } from './guards';

/**
 * What a human needs to recognise a cached demo — `docs/DESIGN.md` §10.2. Written at the moment the
 * demo is stored and never afterwards, which is what keeps a read from writing the catalog.
 */
export interface CatalogMeta {
  /** The name of the file this demo was opened from. The cache key deliberately ignores it. */
  fileName: string;
  /** The demo's own map name. Game vocabulary: canonical, never translated. */
  map: string;
  roundCount: number;
  score: MatchScore;
  storedAt: number;
  /**
   * Who won each round, in order, named by the side each team opened on — `roundWinners`, which is
   * also what `score` is counted over, so the shape and the numbers cannot disagree.
   *
   * **Optional, and that is the migration.** A catalog written before this field loses a reading on
   * its cards and keeps its entries: a demo already on the device opens exactly as it did, and the
   * field arrives the next time that demo is stored. Making it required would have taken `isMeta`
   * with it, and an entry that fails that guard is one the library stops listing.
   */
  winners?: readonly OpeningSide[];
  /** How long the match ran, first round to last, in seconds. Optional for the same reason. */
  durationSeconds?: number;
}

export interface CatalogEntry {
  key: string;
  byteLength: number;
  lastUsedAt: number;
  /**
   * Absent on an entry written before this metadata existed. Such an entry still opens — it is a
   * demo like any other — but it cannot be named, so it is not listed. It leaves the catalog the
   * way every entry does: evicted, or replaced by a store that carries the metadata.
   */
  meta?: CatalogMeta;
}

/** One catalog entry as the screens read it: an entry that has metadata, flattened. */
export interface SavedDemo extends CatalogMeta {
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

function isScore(value: unknown): value is MatchScore {
  return (
    isRecord(value) && typeof value.startedCt === 'number' && typeof value.startedT === 'number'
  );
}

function isOpeningSide(value: unknown): value is OpeningSide {
  return value === 'ct' || value === 't';
}

/** Absent is valid; present and malformed is not, and costs that one field rather than the entry. */
function winnersIn(value: unknown): readonly OpeningSide[] | undefined {
  return Array.isArray(value) && value.every(isOpeningSide) ? value : undefined;
}

function secondsIn(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

/**
 * The metadata an entry carries, or nothing when the five fields a card cannot do without are not
 * all there.
 *
 * It is written as a reader rather than as a type guard on purpose. A guard would have to claim
 * `winners` and `durationSeconds` are what the type says while checking neither, and the alternative
 * — adding them to the guard — is the one thing this must not do: a field that arrived after a
 * catalog was written would then cost that catalog every entry in it, and those entries are cached
 * demos. Absent and malformed both normalise to absent, and a card states less.
 */
function toMeta(value: unknown): CatalogMeta | undefined {
  if (
    !isRecord(value) ||
    typeof value.fileName !== 'string' ||
    typeof value.map !== 'string' ||
    typeof value.roundCount !== 'number' ||
    typeof value.storedAt !== 'number' ||
    !isScore(value.score)
  ) {
    return undefined;
  }

  const winners = winnersIn(value.winners);
  const durationSeconds = secondsIn(value.durationSeconds);

  return {
    fileName: value.fileName,
    map: value.map,
    roundCount: value.roundCount,
    score: value.score,
    storedAt: value.storedAt,
    ...(winners === undefined ? {} : { winners }),
    ...(durationSeconds === undefined ? {} : { durationSeconds }),
  };
}

/**
 * The three fields that make an entry evictable are the only ones it must have. Metadata arrived
 * later and a malformed one costs a name rather than an entry — dropping the entry would delete a
 * cached demo over a field nothing depends on.
 */
function toEntry(value: unknown): CatalogEntry | null {
  if (
    !isRecord(value) ||
    typeof value.key !== 'string' ||
    typeof value.byteLength !== 'number' ||
    typeof value.lastUsedAt !== 'number'
  ) {
    return null;
  }

  const entry: CatalogEntry = {
    key: value.key,
    byteLength: value.byteLength,
    lastUsedAt: value.lastUsedAt,
  };

  const meta = toMeta(value.meta);

  return meta === undefined ? entry : { ...entry, meta };
}

/** A catalog that cannot be read is an empty one: the files it described are pruned as orphans. */
export function parseCatalog(bytes: Uint8Array<ArrayBuffer>): CatalogEntry[] {
  try {
    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (!Array.isArray(parsed)) return [];

    const entries: CatalogEntry[] = [];

    for (const value of parsed) {
      const entry = toEntry(value);

      if (entry !== null) entries.push(entry);
    }

    return entries;
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

/**
 * A read moves an entry's recency and nothing else. Written separately from `withEntry` because
 * replacing the entry wholesale is how a read would silently forget the name a store recorded.
 */
export function withUse(
  entries: readonly CatalogEntry[],
  used: Omit<CatalogEntry, 'meta'>,
): readonly CatalogEntry[] {
  const meta = entries.find((entry) => entry.key === used.key)?.meta;

  return withEntry(entries, meta === undefined ? used : { ...used, meta });
}

function hasMeta(entry: CatalogEntry): entry is CatalogEntry & { meta: CatalogMeta } {
  return entry.meta !== undefined;
}

/** Most recently used first. The key is the tiebreaker, so the order never depends on chance. */
export function savedDemos(entries: readonly CatalogEntry[]): readonly SavedDemo[] {
  return entries
    .filter(hasMeta)
    .map(({ key, byteLength, lastUsedAt, meta }) => ({ key, byteLength, lastUsedAt, ...meta }))
    .sort((left, right) => right.lastUsedAt - left.lastUsedAt || left.key.localeCompare(right.key));
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
