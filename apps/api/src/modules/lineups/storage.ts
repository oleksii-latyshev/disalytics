import { isLineup, type Lineup, type LineupCollection, normalizeLineup } from '@disa/demo-core';
import { and, asc, count, eq, inArray, isNull, sql } from 'drizzle-orm';
import { Context, type Effect } from 'effect';
import { type D1Binding, makeDb } from '../../db/client';
import { lineupAliases, lineupChanges, lineupRevisions, lineups } from '../../db/schema';
import { attempt, type StorageError } from '../../shared/storage-error';
import {
  type CollectionRemoval,
  type CollectionWrite,
  deleteCollection,
  foreignCollectionIds,
  saveCollections,
  selectCollectionBodies,
  servedCollections,
} from './collection-storage';
import { bumpRevision } from './revision';

export interface MapLineups {
  readonly map: string;
  readonly revision: number;
  readonly lineups: readonly Lineup[];
  /** Live collections, marked built-in, with members whose lineup is gone already left out. */
  readonly collections: readonly LineupCollection[];
}

export interface MapSummary {
  readonly map: string;
  readonly revision: number;
  /** Live lineups, without reading their bodies. */
  readonly count: number;
}

export interface LineupAlias {
  readonly aliasId: string;
  readonly lineupId: string;
}

export interface LineupWrite {
  readonly lineups: readonly Lineup[];
  /** Ids the saved lineups were known by in a file, remembered in the same batch. */
  readonly aliases?: readonly LineupAlias[];
  readonly actor: string;
  readonly now: number;
}

export interface LineupRemoval {
  readonly id: string;
  readonly actor: string;
  readonly now: number;
}

/** Reads and writes of the lineup tables. Every write bumps its map's revision and is logged. */
export class LineupStorage extends Context.Service<
  LineupStorage,
  {
    /** Live lineups and collections of one map and its revision. Malformed rows are skipped. */
    readonly readMap: (map: string) => Effect.Effect<MapLineups, StorageError>;
    /** Every map that has a revision or a live lineup, with both numbers. */
    readonly summary: Effect.Effect<readonly MapSummary[], StorageError>;
    /** Creates or replaces lineups: one atomic batch, one revision bump per map. */
    readonly saveLineups: (write: LineupWrite) => Effect.Effect<void, StorageError>;
    /** The stored lineup each of these ids was merged into earlier, by alias. */
    readonly aliasTargets: (
      ids: readonly string[],
    ) => Effect.Effect<ReadonlyMap<string, string>, StorageError>;
    /** Which of these ids already have a row, deleted or not, in any map. */
    readonly takenIds: (ids: readonly string[]) => Effect.Effect<ReadonlySet<string>, StorageError>;
    /** Soft-deletes a lineup; `false` when there is no live lineup with that id. */
    readonly deleteLineup: (removal: LineupRemoval) => Effect.Effect<boolean, StorageError>;
    /** Creates or replaces collections: one atomic batch, one revision bump per map. */
    readonly saveCollections: (write: CollectionWrite) => Effect.Effect<void, StorageError>;
    /** Soft-deletes a collection; `false` when there is no live collection with that id. */
    readonly deleteCollection: (removal: CollectionRemoval) => Effect.Effect<boolean, StorageError>;
    /** Which of these ids already belong to a collection of another map. */
    readonly foreignCollectionIds: (
      map: string,
      ids: readonly string[],
    ) => Effect.Effect<ReadonlySet<string>, StorageError>;
  }
>()('disalytics/LineupStorage') {}

/** D1 allows 100 bound parameters a statement, and a lineup row binds 8. */
const ROWS_PER_INSERT = 10;
const IDS_PER_LOOKUP = 50;

function chunks<T>(items: readonly T[]): T[][] {
  const out: T[][] = [];
  for (let at = 0; at < items.length; at += ROWS_PER_INSERT) {
    out.push(items.slice(at, at + ROWS_PER_INSERT));
  }
  return out;
}

function parseBody(body: string): unknown {
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}

export function makeLineupStorage(binding: D1Binding): Context.Service.Shape<typeof LineupStorage> {
  const db = makeDb(binding);

  return {
    readMap: (map) =>
      attempt(async () => {
        const [rows, revisions, collectionRows] = await db.batch([
          db
            .select({ body: lineups.body })
            .from(lineups)
            .where(and(eq(lineups.map, map), isNull(lineups.deletedAt)))
            .orderBy(asc(lineups.createdAt), asc(lineups.id)),
          db
            .select({ revision: lineupRevisions.revision })
            .from(lineupRevisions)
            .where(eq(lineupRevisions.map, map)),
          selectCollectionBodies(db, map),
        ]);
        const valid: Lineup[] = [];
        for (const { body } of rows) {
          const entry = parseBody(body);
          if (isLineup(entry) && entry.map === map)
            valid.push({ ...normalizeLineup(entry), isBuiltIn: true });
        }
        const liveIds = new Set(valid.map(({ id }) => id));
        return {
          map,
          revision: revisions[0]?.revision ?? 0,
          lineups: valid,
          collections: servedCollections(collectionRows, map, liveIds),
        };
      }),

    summary: attempt(async () => {
      const [counts, revisions] = await db.batch([
        db
          .select({ map: lineups.map, count: count() })
          .from(lineups)
          .where(isNull(lineups.deletedAt))
          .groupBy(lineups.map),
        db.select().from(lineupRevisions),
      ]);
      const byMap = new Map<string, MapSummary>();
      for (const { map, revision } of revisions) byMap.set(map, { map, revision, count: 0 });
      for (const row of counts) {
        byMap.set(row.map, {
          map: row.map,
          revision: byMap.get(row.map)?.revision ?? 0,
          count: row.count,
        });
      }
      return [...byMap.values()].sort((a, b) => a.map.localeCompare(b.map));
    }),

    saveLineups: ({ lineups: entries, aliases = [], actor, now }) =>
      attempt(async () => {
        if (entries.length === 0) return;
        const rows = entries.map((lineup) => ({
          id: lineup.id,
          map: lineup.map,
          body: JSON.stringify({ ...lineup, isBuiltIn: undefined }),
        }));
        const [first, ...rest] = [
          ...chunks(rows).map((chunk) =>
            db
              .insert(lineups)
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
                target: lineups.id,
                set: {
                  map: sql`excluded.map`,
                  body: sql`excluded.body`,
                  updatedAt: sql`excluded.updated_at`,
                  updatedBy: sql`excluded.updated_by`,
                  deletedAt: null,
                },
              }),
          ),
          ...[...new Set(rows.map((row) => row.map))].map((map) => bumpRevision(db, map)),
          ...chunks(aliases).map((chunk) =>
            db
              .insert(lineupAliases)
              .values(chunk.map((alias) => ({ ...alias, createdAt: now })))
              .onConflictDoUpdate({
                target: lineupAliases.aliasId,
                set: { lineupId: sql`excluded.lineup_id` },
              }),
          ),
          ...chunks(rows).map((chunk) =>
            db.insert(lineupChanges).values(
              chunk.map((row) => ({
                lineupId: row.id,
                map: row.map,
                action: 'save',
                actor,
                at: now,
                body: row.body,
              })),
            ),
          ),
        ];
        if (first === undefined) return;
        await db.batch([first, ...rest]);
      }),

    aliasTargets: (ids) =>
      attempt(async () => {
        const targets = new Map<string, string>();
        for (let at = 0; at < ids.length; at += IDS_PER_LOOKUP) {
          const rows = await db
            .select()
            .from(lineupAliases)
            .where(inArray(lineupAliases.aliasId, ids.slice(at, at + IDS_PER_LOOKUP)));
          for (const row of rows) targets.set(row.aliasId, row.lineupId);
        }
        return targets;
      }),

    takenIds: (ids) =>
      attempt(async () => {
        const taken = new Set<string>();
        for (let at = 0; at < ids.length; at += IDS_PER_LOOKUP) {
          const rows = await db
            .select({ id: lineups.id })
            .from(lineups)
            .where(inArray(lineups.id, ids.slice(at, at + IDS_PER_LOOKUP)));
          for (const row of rows) taken.add(row.id);
        }
        return taken;
      }),

    deleteLineup: ({ id, actor, now }) =>
      attempt(async () => {
        const [found] = await db
          .select({ map: lineups.map })
          .from(lineups)
          .where(and(eq(lineups.id, id), isNull(lineups.deletedAt)));
        if (found === undefined) return false;

        await db.batch([
          db
            .update(lineups)
            .set({ deletedAt: now, updatedAt: now, updatedBy: actor })
            .where(eq(lineups.id, id)),
          bumpRevision(db, found.map),
          db
            .insert(lineupChanges)
            .values({ lineupId: id, map: found.map, action: 'delete', actor, at: now }),
        ]);
        return true;
      }),

    saveCollections: (write) => attempt(() => saveCollections(db, write)),

    deleteCollection: (removal) => attempt(() => deleteCollection(db, removal)),

    foreignCollectionIds: (map, ids) => attempt(() => foreignCollectionIds(db, map, ids)),
  };
}
