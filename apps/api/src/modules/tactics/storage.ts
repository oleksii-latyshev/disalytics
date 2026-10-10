import { isTactic, type Tactic } from '@disa/demo-core';
import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { Context, type Effect } from 'effect';
import { type D1Binding, type Db, makeDb } from '../../db/client';
import { lineupChanges, tacticRevision, tactics } from '../../db/schema';
import { attempt, type StorageError } from '../../shared/storage-error';

export interface SiteTactics {
  readonly revision: number;
  /** Live tactics, oldest first; rows that no longer pass `isTactic` are left out. */
  readonly tactics: readonly Tactic[];
}

export interface TacticWrite {
  readonly tactics: readonly Tactic[];
  readonly actor: string;
  readonly now: number;
}

export interface TacticRemoval {
  readonly id: string;
  readonly actor: string;
  readonly now: number;
}

export const TACTIC_SAVED = 'tactic:save';
export const TACTIC_DELETED = 'tactic:delete';

/** Reads and writes of the tactics table. Every write bumps the one revision and is logged. */
export class TacticStorage extends Context.Service<
  TacticStorage,
  {
    readonly read: Effect.Effect<SiteTactics, StorageError>;
    /** Creates or replaces tactics: one atomic batch, one revision bump. */
    readonly save: (write: TacticWrite) => Effect.Effect<void, StorageError>;
    /** Soft-deletes a tactic; `false` when there is no live tactic with that id. */
    readonly remove: (removal: TacticRemoval) => Effect.Effect<boolean, StorageError>;
  }
>()('disalytics/TacticStorage') {}

const REVISION_ROW = 1;

function bumpRevision(db: Db) {
  return db
    .insert(tacticRevision)
    .values({ id: REVISION_ROW, revision: 1 })
    .onConflictDoUpdate({
      target: tacticRevision.id,
      set: { revision: sql`${tacticRevision.revision} + 1` },
    });
}

function parseBody(body: string): unknown {
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}

export function makeTacticStorage(binding: D1Binding): Context.Service.Shape<typeof TacticStorage> {
  const db = makeDb(binding);

  return {
    read: attempt(async () => {
      const [rows, revisions] = await db.batch([
        db
          .select({ body: tactics.body })
          .from(tactics)
          .where(isNull(tactics.deletedAt))
          .orderBy(asc(tactics.createdAt), asc(tactics.id)),
        db.select({ revision: tacticRevision.revision }).from(tacticRevision),
      ]);
      const valid: Tactic[] = [];
      for (const { body } of rows) {
        const entry = parseBody(body);
        if (isTactic(entry)) valid.push(entry);
      }
      return { revision: revisions[0]?.revision ?? 0, tactics: valid };
    }),

    save: ({ tactics: entries, actor, now }) =>
      attempt(async () => {
        if (entries.length === 0) return;
        const rows = entries.map((tactic) => ({
          id: tactic.id,
          map: tactic.map,
          body: JSON.stringify(tactic),
        }));
        const inserts = rows.map((row) =>
          db
            .insert(tactics)
            .values({ ...row, createdAt: now, createdBy: actor, updatedAt: now, updatedBy: actor })
            .onConflictDoUpdate({
              target: tactics.id,
              set: {
                map: sql`excluded.map`,
                body: sql`excluded.body`,
                updatedAt: sql`excluded.updated_at`,
                updatedBy: sql`excluded.updated_by`,
                deletedAt: null,
              },
            }),
        );
        const logs = rows.map((row) =>
          db.insert(lineupChanges).values({
            lineupId: row.id,
            map: row.map,
            action: TACTIC_SAVED,
            actor,
            at: now,
            body: row.body,
          }),
        );
        const [first, ...rest] = [...inserts, bumpRevision(db), ...logs];
        if (first === undefined) return;
        await db.batch([first, ...rest]);
      }),

    remove: ({ id, actor, now }) =>
      attempt(async () => {
        const [found] = await db
          .select({ map: tactics.map })
          .from(tactics)
          .where(and(eq(tactics.id, id), isNull(tactics.deletedAt)));
        if (found === undefined) return false;

        await db.batch([
          db
            .update(tactics)
            .set({ deletedAt: now, updatedAt: now, updatedBy: actor })
            .where(eq(tactics.id, id)),
          bumpRevision(db),
          db
            .insert(lineupChanges)
            .values({ lineupId: id, map: found.map, action: TACTIC_DELETED, actor, at: now }),
        ]);
        return true;
      }),
  };
}
