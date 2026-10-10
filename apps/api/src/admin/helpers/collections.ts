import {
  type BadRequest,
  badRequest,
  type CollectionDecision,
  type CollectionPreviewItem,
  type CollectionProblemCode,
  collectionProblems,
} from '@disa/admin-contract';
import { cleanCollectionName, isLineupCollection, type LineupCollection } from '@disa/demo-core';
import { Effect } from 'effect';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** What a file's lineup id can be answered by: the lineups on the site, and the ids merged into them. */
export interface MemberLookup {
  readonly live: ReadonlySet<string>;
  /** File id → the stored lineup it was merged into. */
  readonly aliases: ReadonlyMap<string, string>;
}

export interface Resolved {
  readonly lineupIds: readonly string[];
  /** Members that no lineup on the site answers to. */
  readonly dropped: number;
}

/**
 * Each member of a file's collection as a lineup on the site: itself when it is there, else the
 * lineup its id was merged into, else dropped. Two members that land on one lineup count once.
 */
export function resolveMembers(ids: readonly string[], { live, aliases }: MemberLookup): Resolved {
  const resolved = new Set<string>();
  let dropped = 0;
  for (const id of ids) {
    const aliased = aliases.get(id);
    const target = live.has(id) ? id : aliased !== undefined && live.has(aliased) ? aliased : null;
    if (target === null) dropped += 1;
    else resolved.add(target);
  }
  return { lineupIds: [...resolved], dropped };
}

/** Every lineup id a file's collections name, for looking up their aliases. */
export function memberIdsOf(collections: readonly LineupCollection[]): string[] {
  return [...new Set(collections.flatMap(({ lineupIds }) => lineupIds))];
}

/** The lineup ids the page's decisions name, whatever shape the collections turn out to have. */
export function memberIdsOfDecisions(decisions: readonly CollectionDecision[]): string[] {
  const ids = new Set<string>();
  for (const { collection } of decisions) {
    if (!isRecord(collection) || !Array.isArray(collection.lineupIds)) continue;
    for (const id of collection.lineupIds) if (typeof id === 'string') ids.add(id);
  }
  return [...ids];
}

function invalidEntry(detail: string) {
  return Effect.fail(badRequest('invalid_file', detail));
}

/** The collections of a file's `collections` array that belong to `map`; the field may be absent. */
export function collectionsOfMap(
  file: unknown,
  map: string,
): Effect.Effect<
  { readonly collections: LineupCollection[]; readonly ignored: number },
  BadRequest
> {
  return Effect.suspend(() => {
    const entries = isRecord(file) ? file.collections : undefined;
    if (entries === undefined) return Effect.succeed({ collections: [], ignored: 0 });
    if (!Array.isArray(entries)) return invalidEntry('file.collections must be an array');

    const collections: LineupCollection[] = [];
    const seen = new Set<string>();
    for (const [index, entry] of entries.entries()) {
      if (!isLineupCollection(entry))
        return invalidEntry(`Invalid collection entry at index ${index}`);
      if (seen.has(entry.id)) return invalidEntry(`Collection id ${entry.id} appears twice`);
      seen.add(entry.id);
      collections.push({ ...entry, name: cleanCollectionName(entry.name) });
    }
    const ofMap = collections.filter((collection) => collection.map === map);
    return Effect.succeed({ collections: ofMap, ignored: collections.length - ofMap.length });
  });
}

function nameKey(name: string): string {
  return cleanCollectionName(name).toLowerCase();
}

function without(ids: readonly string[], others: readonly string[]): string[] {
  const skip = new Set(others);
  return ids.filter((id) => !skip.has(id));
}

/** Classifies every collection of the file against the map's collections on the site. */
export function planCollections(
  stored: readonly LineupCollection[],
  incoming: readonly LineupCollection[],
  map: string,
  lookup: MemberLookup,
): CollectionPreviewItem[] {
  const storedById = new Map(stored.map((collection) => [collection.id, collection]));
  const seenNames = new Set<string>();
  return incoming.map((collection): CollectionPreviewItem => {
    const { lineupIds, dropped } = resolveMembers(collection.lineupIds, lookup);
    const resolved: LineupCollection = { ...collection, lineupIds };
    const problems: CollectionProblemCode[] = collectionProblems(collection, map);
    const key = nameKey(collection.name);
    const clashes =
      seenNames.has(key) ||
      stored.some((other) => other.id !== collection.id && nameKey(other.name) === key);
    seenNames.add(key);
    if (clashes) problems.push('name_taken');

    const before = storedById.get(collection.id);
    const base = { id: collection.id, name: collection.name, collection: resolved, dropped };
    if (before === undefined) {
      return { ...base, status: 'new', added: lineupIds, removed: [], problems };
    }
    const added = without(lineupIds, before.lineupIds);
    const removed = without(before.lineupIds, lineupIds);
    const isSame = before.name === collection.name && added.length === 0 && removed.length === 0;
    return {
      ...base,
      status: isSame ? 'unchanged' : 'update',
      stored: before,
      added,
      removed,
      problems,
    };
  });
}

export interface CheckedCollections {
  readonly writes: readonly LineupCollection[];
  readonly skipped: number;
  readonly dropped: number;
}

function idOf({ collection }: CollectionDecision): string {
  return isRecord(collection) && typeof collection.id === 'string' ? collection.id : '';
}

function invalid(detail: string): BadRequest {
  return badRequest('invalid_decisions', detail);
}

function bodyOf(
  decision: CollectionDecision,
  map: string,
): Effect.Effect<LineupCollection, BadRequest> {
  const { collection } = decision;
  if (!isLineupCollection(collection) || collection.map !== map) {
    return Effect.fail(badRequest('invalid_collection', 'A collection is not valid for this map'));
  }
  const { isBuiltIn: _flag, ...rest } = collection;
  return Effect.succeed({ ...rest, name: cleanCollectionName(rest.name) });
}

function checkedWrite(
  decision: CollectionDecision,
  input: { readonly map: string; readonly now: number },
  context: { readonly before: LineupCollection | undefined; readonly lookup: MemberLookup },
): Effect.Effect<{ readonly write: LineupCollection; readonly dropped: number }, BadRequest> {
  return Effect.gen(function* () {
    const body = yield* bodyOf(decision, input.map);
    const { before } = context;
    if (decision.action === 'add' && before !== undefined) {
      return yield* Effect.fail(invalid(`${body.id} is already stored`));
    }
    if (decision.action === 'replace' && before === undefined) {
      return yield* Effect.fail(invalid(`Replace names ${body.id}, which is not stored`));
    }
    const resolved = resolveMembers(body.lineupIds, context.lookup);
    const write = {
      ...body,
      lineupIds: resolved.lineupIds,
      createdAt: before?.createdAt ?? input.now,
      updatedAt: input.now,
    };
    return { write, dropped: resolved.dropped };
  });
}

/** No two collections of the map share a name once the writes are in, whatever the case. */
function uniqueNames(
  map: string,
  stored: readonly LineupCollection[],
  writes: readonly LineupCollection[],
): Effect.Effect<void, BadRequest> {
  const rewritten = new Set(writes.map(({ id }) => id));
  const names = new Set(
    stored.filter(({ id }) => !rewritten.has(id)).map(({ name }) => nameKey(name)),
  );
  for (const { name } of writes) {
    const key = nameKey(name);
    if (names.has(key)) {
      return Effect.fail(
        badRequest(
          'collection_name_taken',
          `Another collection of ${map} is already named ${name}`,
        ),
      );
    }
    names.add(key);
  }
  return Effect.void;
}

/**
 * Turns the page's decisions into the collections to write, or refuses them. Nothing the page says
 * about status is trusted: a replace must name a collection stored for this map, an add must bring
 * an id no live collection uses, the members are resolved here against the lineups on the site, and
 * no two collections of the map may share a name.
 */
export function checkCollectionDecisions<E>(input: {
  readonly map: string;
  readonly decisions: readonly CollectionDecision[];
  readonly stored: readonly LineupCollection[];
  readonly lookup: MemberLookup;
  readonly now: number;
  readonly foreign: (ids: readonly string[]) => Effect.Effect<ReadonlySet<string>, E>;
}): Effect.Effect<CheckedCollections, BadRequest | E> {
  const { map, decisions, stored, lookup, now } = input;
  return Effect.gen(function* () {
    const storedById = new Map(stored.map((collection) => [collection.id, collection]));
    const writes: LineupCollection[] = [];
    let dropped = 0;

    for (const decision of decisions) {
      if (decision.action === 'skip') continue;
      const checked = yield* checkedWrite(
        decision,
        { map, now },
        { before: storedById.get(idOf(decision)), lookup },
      );
      if (writes.some(({ id }) => id === checked.write.id)) {
        return yield* Effect.fail(invalid(`${checked.write.id} is written twice`));
      }
      writes.push(checked.write);
      dropped += checked.dropped;
    }

    const foreign = yield* input.foreign(writes.map(({ id }) => id));
    const stray = writes.find(({ id }) => foreign.has(id));
    if (stray !== undefined) {
      return yield* Effect.fail(invalid(`${stray.id} belongs to another map`));
    }
    yield* uniqueNames(map, stored, writes);
    return { writes, skipped: decisions.filter(({ action }) => action === 'skip').length, dropped };
  });
}
