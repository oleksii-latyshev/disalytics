import { isLineup, type Lineup } from '@disa/demo-core';
import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { Context, type Effect } from 'effect';
import { type D1Binding, makeDb } from '../../db/client';
import { lineupChanges, lineupRevisions, lineups } from '../../db/schema';
import { attempt, type StorageError } from '../../shared/storage-error';

export interface MapLineups {
  readonly map: string;
  readonly revision: number;
  readonly lineups: readonly Lineup[];
}

export interface LineupWrite {
  readonly lineups: readonly Lineup[];
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
    /** Live lineups of one map and its revision. Rows that fail `isLineup` are skipped. */
    readonly readMap: (map: string) => Effect.Effect<MapLineups, StorageError>;
    /** Creates or replaces lineups: one atomic batch, one revision bump per map. */
    readonly saveLineups: (write: LineupWrite) => Effect.Effect<void, StorageError>;
    /** Soft-deletes a lineup; `false` when there is no live lineup with that id. */
    readonly deleteLineup: (removal: LineupRemoval) => Effect.Effect<boolean, StorageError>;
  }
>()('disalytics/LineupStorage') {}

/** D1 allows 100 bound parameters a statement, and a lineup row binds 8. */
const ROWS_PER_INSERT = 10;

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

  const bumpRevision = (map: string) =>
    db
      .insert(lineupRevisions)
      .values({ map, revision: 1 })
      .onConflictDoUpdate({
        target: lineupRevisions.map,
        set: { revision: sql`${lineupRevisions.revision} + 1` },
      });

  return {
    readMap: (map) =>
      attempt(async () => {
        const [rows, revisions] = await db.batch([
          db
            .select({ body: lineups.body })
            .from(lineups)
            .where(and(eq(lineups.map, map), isNull(lineups.deletedAt)))
            .orderBy(asc(lineups.createdAt), asc(lineups.id)),
          db
            .select({ revision: lineupRevisions.revision })
            .from(lineupRevisions)
            .where(eq(lineupRevisions.map, map)),
        ]);
        const valid: Lineup[] = [];
        for (const { body } of rows) {
          const entry = parseBody(body);
          if (isLineup(entry) && entry.map === map) valid.push({ ...entry, isBuiltIn: true });
        }
        return { map, revision: revisions[0]?.revision ?? 0, lineups: valid };
      }),

    saveLineups: ({ lineups: entries, actor, now }) =>
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
          ...[...new Set(rows.map((row) => row.map))].map(bumpRevision),
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
          bumpRevision(found.map),
          db
            .insert(lineupChanges)
            .values({ lineupId: id, map: found.map, action: 'delete', actor, at: now }),
        ]);
        return true;
      }),
  };
}
