import { sql } from 'drizzle-orm';
import type { Db } from '../../db/client';
import { lineupRevisions } from '../../db/schema';

/** The statement that moves a map's counter on, creating it at 1; run it in the write's batch. */
export function bumpRevision(db: Db, map: string) {
  return db
    .insert(lineupRevisions)
    .values({ map, revision: 1 })
    .onConflictDoUpdate({
      target: lineupRevisions.map,
      set: { revision: sql`${lineupRevisions.revision} + 1` },
    });
}
