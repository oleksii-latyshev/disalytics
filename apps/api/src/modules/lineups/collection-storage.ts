import { isLineupCollection, type LineupCollection, prunedCollection } from '@disa/demo-core';
import { and, asc, eq, inArray, isNull, ne, sql } from 'drizzle-orm';
import type { Db } from '../../db/client';
import { lineupChanges, lineupCollections } from '../../db/schema';
import { bumpRevision } from './revision';

export interface CollectionWrite {
  readonly collections: readonly LineupCollection[];
  readonly actor: string;
  readonly now: number;
}

export interface CollectionRemoval {
  readonly id: string;
  readonly actor: string;
  readonly now: number;
}

/** D1 allows 100 bound parameters a statement, and a collection row binds 8. */
const ROWS_PER_INSERT = 10;
const IDS_PER_LOOKUP = 50;

export const COLLECTION_SAVED = 'collection:save';
export const COLLECTION_DELETED = 'collection:delete';

function bodyOf(collection: LineupCollection): string {
  const { isBuiltIn: _flag, ...stored } = collection;
  return JSON.stringify(stored);
}

function parseBody(body: string): unknown {
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}

/** The live collections of a map, oldest first, to run in the same batch as the lineups. */
export function selectCollectionBodies(db: Db, map: string) {
  return db
    .select({ body: lineupCollections.body })
    .from(lineupCollections)
    .where(and(eq(lineupCollections.map, map), isNull(lineupCollections.deletedAt)))
    .orderBy(asc(lineupCollections.createdAt), asc(lineupCollections.id));
}

/**
 * The stored collections that are still well-formed, marked built-in and without members whose
 * lineup is gone. Rows that fail `isLineupCollection` are skipped.
 */
export function servedCollections(
  rows: readonly { readonly body: string }[],
  map: string,
  liveIds: ReadonlySet<string>,
): LineupCollection[] {
  const served: LineupCollection[] = [];
  for (const { body } of rows) {
    const entry = parseBody(body);
    if (isLineupCollection(entry) && entry.map === map) {
      served.push({ ...prunedCollection(entry, liveIds), isBuiltIn: true });
    }
  }
  return served;
}

export async function saveCollections(
  db: Db,
  { collections, actor, now }: CollectionWrite,
): Promise<void> {
  const [first] = collections;
  if (first === undefined) return;
  const rows = collections.map((collection) => ({
    id: collection.id,
    map: collection.map,
    body: bodyOf(collection),
  }));
  const inserts = [];
  for (let at = 0; at < rows.length; at += ROWS_PER_INSERT) {
    const chunk = rows.slice(at, at + ROWS_PER_INSERT);
    inserts.push(
      db
        .insert(lineupCollections)
        .values(
          chunk.map((row) => ({
            ...row,
            createdAt: now,
            createdBy: actor,
            updatedAt: now,
            updatedBy: actor,
          })),
        )
        .onConflictDoUpdate({
          target: lineupCollections.id,
          set: {
            map: sql`excluded.map`,
            body: sql`excluded.body`,
            updatedAt: sql`excluded.updated_at`,
            updatedBy: sql`excluded.updated_by`,
            deletedAt: null,
          },
        }),
      db.insert(lineupChanges).values(
        chunk.map((row) => ({
          lineupId: row.id,
          map: row.map,
          action: COLLECTION_SAVED,
          actor,
          at: now,
          body: row.body,
        })),
      ),
    );
  }
  const [firstInsert, ...rest] = inserts;
  if (firstInsert === undefined) return;
  await db.batch([
    firstInsert,
    ...rest,
    ...[...new Set(rows.map((row) => row.map))].map((map) => bumpRevision(db, map)),
  ]);
}

/** Soft-deletes a collection; `false` when there is no live collection with that id. */
export async function deleteCollection(
  db: Db,
  { id, actor, now }: CollectionRemoval,
): Promise<boolean> {
  const [found] = await db
    .select({ map: lineupCollections.map })
    .from(lineupCollections)
    .where(and(eq(lineupCollections.id, id), isNull(lineupCollections.deletedAt)));
  if (found === undefined) return false;

  await db.batch([
    db
      .update(lineupCollections)
      .set({ deletedAt: now, updatedAt: now, updatedBy: actor })
      .where(eq(lineupCollections.id, id)),
    bumpRevision(db, found.map),
    db
      .insert(lineupChanges)
      .values({ lineupId: id, map: found.map, action: COLLECTION_DELETED, actor, at: now }),
  ]);
  return true;
}

/** Which of these ids already belong to a collection of another map, deleted or not. */
export async function foreignCollectionIds(
  db: Db,
  map: string,
  ids: readonly string[],
): Promise<ReadonlySet<string>> {
  const foreign = new Set<string>();
  for (let at = 0; at < ids.length; at += IDS_PER_LOOKUP) {
    const rows = await db
      .select({ id: lineupCollections.id })
      .from(lineupCollections)
      .where(
        and(
          inArray(lineupCollections.id, ids.slice(at, at + IDS_PER_LOOKUP)),
          ne(lineupCollections.map, map),
        ),
      );
    for (const row of rows) foreign.add(row.id);
  }
  return foreign;
}
