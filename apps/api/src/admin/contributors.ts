import type { Contributor } from '@disa/admin-contract';
import { count, isNull } from 'drizzle-orm';
import { Context, type Effect } from 'effect';
import { type D1Binding, makeDb } from '../db/client';
import { admins, lineups } from '../db/schema';
import { attempt, type StorageError } from '../shared/storage-error';

/** Who added the live lineups, read from the `created_by` the first save stamped on each row. */
export class Contributors extends Context.Service<
  Contributors,
  {
    readonly list: Effect.Effect<readonly Contributor[], StorageError>;
  }
>()('disalytics/admin/Contributors') {}

export function makeContributors(binding: D1Binding): Context.Service.Shape<typeof Contributors> {
  const db = makeDb(binding);
  return {
    list: attempt(async () => {
      const [rows, people] = await db.batch([
        db
          .select({ name: lineups.createdBy, map: lineups.map, total: count() })
          .from(lineups)
          .where(isNull(lineups.deletedAt))
          .groupBy(lineups.createdBy, lineups.map),
        db
          .select({ name: admins.name, steamUrl: admins.steamUrl })
          .from(admins)
          .orderBy(admins.createdAt),
      ]);

      const steamByName = new Map<string, string>();
      for (const { name, steamUrl } of people) {
        if (steamUrl !== null && !steamByName.has(name)) steamByName.set(name, steamUrl);
      }

      const byName = new Map<string, { total: number; byMap: Record<string, number> }>();
      for (const { name, map, total } of rows) {
        const entry = byName.get(name) ?? { total: 0, byMap: {} };
        entry.total += total;
        entry.byMap[map] = total;
        byName.set(name, entry);
      }

      return [...byName]
        .map(([name, { total, byMap }]): Contributor => {
          const steamUrl = steamByName.get(name);
          return steamUrl === undefined ? { name, total, byMap } : { name, steamUrl, total, byMap };
        })
        .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
    }),
  };
}
