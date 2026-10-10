import type {
  Contributor,
  OverviewChange,
  OverviewCounts,
  OverviewKind,
  OverviewMap,
} from '@disa/admin-contract';
import { and, count, desc, eq, gte, inArray, isNull } from 'drizzle-orm';
import { Context, type Effect } from 'effect';
import { type D1Binding, type Db, makeDb } from '../db/client';
import { lineupChanges, lineupCollections, lineups, tactics } from '../db/schema';
import { attempt, type StorageError } from '../shared/storage-error';

export const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
export const RECENT_LIMIT = 8;

export interface OverviewData {
  readonly maps: readonly OverviewMap[];
  readonly totals: OverviewCounts & { readonly maps: number };
  readonly week: OverviewCounts;
  readonly recent: readonly OverviewChange[];
}

/** The numbers behind the admin's home, read from the live rows and the change log. */
export class Overview extends Context.Service<
  Overview,
  {
    readonly read: (now: number) => Effect.Effect<OverviewData, StorageError>;
    /** When this person last wrote anything, from the change log. */
    readonly lastWriteBy: (actor: string) => Effect.Effect<number | null, StorageError>;
  }
>()('disalytics/admin/Overview') {}

/** The kind a change-log action belongs to, and what it did. `save` is an add or an update. */
export function kindOfAction(action: string): { kind: OverviewKind; saved: boolean } | null {
  const [kind, verb] = action.includes(':') ? action.split(':') : ['lineup', action];
  if (kind !== 'lineup' && kind !== 'collection' && kind !== 'tactic') return null;
  if (verb !== 'save' && verb !== 'delete') return null;
  return { kind, saved: verb === 'save' };
}

/** The `title` of a lineup or tactic, or the `name` of a collection, out of its stored body. */
export function titleOfBody(kind: OverviewKind, body: string): string | undefined {
  try {
    const parsed: unknown = JSON.parse(body);
    if (typeof parsed !== 'object' || parsed === null) return undefined;
    const value = Object.getOwnPropertyDescriptor(
      parsed,
      kind === 'collection' ? 'name' : 'title',
    )?.value;
    return typeof value === 'string' && value !== '' ? value : undefined;
  } catch {
    return undefined;
  }
}

/** Per-map counts of the three kinds, empty maps left out and the busiest first. */
export function mergeMaps(
  rows: Readonly<Record<keyof OverviewCounts, readonly { map: string; count: number }[]>>,
): OverviewMap[] {
  const byMap = new Map<string, OverviewMap>();
  for (const key of ['lineups', 'collections', 'tactics'] as const) {
    for (const row of rows[key]) {
      const entry = byMap.get(row.map) ?? { map: row.map, lineups: 0, collections: 0, tactics: 0 };
      byMap.set(row.map, { ...entry, [key]: row.count });
    }
  }
  return [...byMap.values()].sort((a, b) => a.map.localeCompare(b.map));
}

interface LogRow {
  readonly id: number;
  readonly lineupId: string;
  readonly map: string;
  readonly action: string;
  readonly actor: string;
  readonly at: number;
}

type Item = { readonly body: string; readonly createdAt: number };

/** One log row as the home shows it: a save is an add when it is the write that created the item. */
function changeOf(
  row: LogRow,
  kind: OverviewKind,
  saved: boolean,
  item: Item | undefined,
): OverviewChange {
  const title = item === undefined ? undefined : titleOfBody(kind, item.body);
  const action: OverviewChange['action'] = !saved
    ? 'delete'
    : item?.createdAt === row.at
      ? 'add'
      : 'update';
  const base = { id: row.id, map: row.map, kind, action, actor: row.actor, at: row.at };
  return title === undefined ? base : { ...base, title };
}

/** The log rows with the title and creation time of what they touched, read from the item's row. */
async function recentChanges(db: Db, log: readonly LogRow[]): Promise<OverviewChange[]> {
  const entries = log.flatMap((row) => {
    const found = kindOfAction(row.action);
    return found === null ? [] : [{ row, ...found }];
  });
  const lookup = async (kind: OverviewKind) => {
    const ids = [
      ...new Set(entries.filter((entry) => entry.kind === kind).map(({ row }) => row.lineupId)),
    ];
    if (ids.length === 0) return new Map<string, Item>();
    const table = kind === 'lineup' ? lineups : kind === 'collection' ? lineupCollections : tactics;
    const found = await db
      .select({ id: table.id, body: table.body, createdAt: table.createdAt })
      .from(table)
      .where(inArray(table.id, ids));
    return new Map(found.map(({ id, ...rest }) => [id, rest]));
  };
  const [lineupItems, collectionItems, tacticItems] = await Promise.all([
    lookup('lineup'),
    lookup('collection'),
    lookup('tactic'),
  ]);
  const itemsOf = { lineup: lineupItems, collection: collectionItems, tactic: tacticItems };
  return entries.map(({ row, kind, saved }) =>
    changeOf(row, kind, saved, itemsOf[kind].get(row.lineupId)),
  );
}

export function makeOverview(binding: D1Binding): Context.Service.Shape<typeof Overview> {
  const db = makeDb(binding);
  return {
    lastWriteBy: (actor) =>
      attempt(async () => {
        const [found] = await db
          .select({ at: lineupChanges.at })
          .from(lineupChanges)
          .where(eq(lineupChanges.actor, actor))
          .orderBy(desc(lineupChanges.id))
          .limit(1);
        return found?.at ?? null;
      }),
    read: (now) =>
      attempt(async () => {
        const since = now - WEEK_MS;
        const live = <T extends typeof lineups | typeof lineupCollections | typeof tactics>(
          table: T,
        ) =>
          db
            .select({ map: table.map, count: count() })
            .from(table)
            .where(isNull(table.deletedAt))
            .groupBy(table.map);
        const fresh = <T extends typeof lineups | typeof lineupCollections | typeof tactics>(
          table: T,
        ) =>
          db
            .select({ count: count() })
            .from(table)
            .where(and(isNull(table.deletedAt), gte(table.createdAt, since)));

        const [
          lineupRows,
          collectionRows,
          tacticRows,
          newLineups,
          newCollections,
          newTactics,
          log,
        ] = await db.batch([
          live(lineups),
          live(lineupCollections),
          live(tactics),
          fresh(lineups),
          fresh(lineupCollections),
          fresh(tactics),
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
            .orderBy(desc(lineupChanges.id))
            .limit(RECENT_LIMIT),
        ]);

        const maps = mergeMaps({
          lineups: lineupRows,
          collections: collectionRows,
          tactics: tacticRows,
        });
        const sum = (rows: readonly { count: number }[]) =>
          rows.reduce((total, row) => total + row.count, 0);

        const recent = await recentChanges(db, log);

        return {
          maps,
          totals: {
            lineups: sum(lineupRows),
            collections: sum(collectionRows),
            tactics: sum(tacticRows),
            maps: maps.filter((entry) => entry.lineups > 0).length,
          },
          week: {
            lineups: sum(newLineups),
            collections: sum(newCollections),
            tactics: sum(newTactics),
          },
          recent,
        };
      }),
  };
}

/** The three people with the most live lineups, and how many the asker has. */
export function topContributors(
  all: readonly Contributor[],
  name: string,
): { top: Contributor[]; mine: number } {
  return {
    top: all.slice(0, 3),
    mine: all.find((entry) => entry.name === name)?.total ?? 0,
  };
}
