import type { ChangeEntry } from '@disa/admin-contract';
import { desc, eq } from 'drizzle-orm';
import { Context, type Effect } from 'effect';
import { type D1Binding, makeDb } from '../db/client';
import { lineupChanges } from '../db/schema';
import { attempt, type StorageError } from '../shared/storage-error';

const LIMIT = 50;

/** Reads the append-only write log. The stored bodies stay in the table. */
export class ChangeLog extends Context.Service<
  ChangeLog,
  {
    readonly recent: (map: string | undefined) => Effect.Effect<ChangeEntry[], StorageError>;
  }
>()('disalytics/admin/ChangeLog') {}

export function makeChangeLog(binding: D1Binding): Context.Service.Shape<typeof ChangeLog> {
  const db = makeDb(binding);
  return {
    recent: (map) =>
      attempt(() =>
        db
          .select({
            id: lineupChanges.id,
            lineupId: lineupChanges.lineupId,
            map: lineupChanges.map,
            action: lineupChanges.action,
            actor: lineupChanges.actor,
            at: lineupChanges.at,
          })
          .from(lineupChanges)
          .where(map === undefined ? undefined : eq(lineupChanges.map, map))
          .orderBy(desc(lineupChanges.id))
          .limit(LIMIT),
      ),
  };
}
