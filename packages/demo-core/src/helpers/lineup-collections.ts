/** A named list of lineups of one map — "Execute B", "Retake B". No roles and no order of throws. */
export interface LineupCollection {
  readonly id: string;
  readonly name: string;
  readonly map: string;
  /** Lineup ids, built-ins included. An id with no lineup behind it is skipped when read. */
  readonly lineupIds: readonly string[];
  readonly createdAt: number;
  readonly updatedAt: number;
}

export const MAX_COLLECTION_NAME_LENGTH = 48;

function isNonBlank(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isTimestamp(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function isLineupCollection(value: unknown): value is LineupCollection {
  if (typeof value !== 'object' || value === null) return false;
  const item: Record<string, unknown> = { ...value };
  const ids = item.lineupIds;

  return (
    isNonBlank(item.id) &&
    isNonBlank(item.name) &&
    item.name.trim().length <= MAX_COLLECTION_NAME_LENGTH &&
    isNonBlank(item.map) &&
    Array.isArray(ids) &&
    ids.every(isNonBlank) &&
    new Set(ids).size === ids.length &&
    isTimestamp(item.createdAt) &&
    isTimestamp(item.updatedAt)
  );
}

/** The name as it is stored: trimmed and within the limit. */
export function cleanCollectionName(name: string): string {
  return name.trim().slice(0, MAX_COLLECTION_NAME_LENGTH).trim();
}

/** Whether another collection of the same map already has this name, ignoring case. */
export function isCollectionNameTaken(
  collections: readonly LineupCollection[],
  name: string,
  exceptId?: string,
): boolean {
  const wanted = cleanCollectionName(name).toLowerCase();
  return collections.some(
    (collection) => collection.id !== exceptId && collection.name.toLowerCase() === wanted,
  );
}

export function newLineupCollection(
  id: string,
  name: string,
  map: string,
  lineupIds: readonly string[],
  now: number,
): LineupCollection {
  return {
    id,
    name: cleanCollectionName(name),
    map,
    lineupIds: [...new Set(lineupIds)],
    createdAt: now,
    updatedAt: now,
  };
}

export function renamedCollection(
  collection: LineupCollection,
  name: string,
  now: number,
): LineupCollection {
  return { ...collection, name: cleanCollectionName(name), updatedAt: now };
}

/** The collection with these lineups added at the end; ones it already holds keep their place. */
export function withCollectionMembers(
  collection: LineupCollection,
  ids: readonly string[],
  now: number,
): LineupCollection {
  return {
    ...collection,
    lineupIds: [...new Set([...collection.lineupIds, ...ids])],
    updatedAt: now,
  };
}

export function withoutCollectionMembers(
  collection: LineupCollection,
  ids: readonly string[],
  now: number,
): LineupCollection {
  const removed = new Set(ids);
  return {
    ...collection,
    lineupIds: collection.lineupIds.filter((id) => !removed.has(id)),
    updatedAt: now,
  };
}

/** The collection without ids that no lineup answers to any more. */
export function prunedCollection(
  collection: LineupCollection,
  knownIds: ReadonlySet<string>,
): LineupCollection {
  const lineupIds = collection.lineupIds.filter((id) => knownIds.has(id));
  return lineupIds.length === collection.lineupIds.length
    ? collection
    : { ...collection, lineupIds };
}

/**
 * What to write when a file's collections meet the stored ones: a collection the device has not
 * seen is added, and one it has is replaced only by a later edit, so importing an old backup never
 * undoes a newer change.
 */
export function collectionsToImport(
  stored: readonly LineupCollection[],
  incoming: readonly LineupCollection[],
): readonly LineupCollection[] {
  const byId = new Map(stored.map((collection) => [collection.id, collection]));
  return incoming.filter((collection) => {
    const existing = byId.get(collection.id);
    return existing === undefined || collection.updatedAt > existing.updatedAt;
  });
}
