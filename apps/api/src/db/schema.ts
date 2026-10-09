import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const lineups = sqliteTable(
  'lineups',
  {
    id: text('id').primaryKey(),
    map: text('map').notNull(),
    body: text('body').notNull(),
    createdAt: integer('created_at').notNull(),
    createdBy: text('created_by').notNull(),
    updatedAt: integer('updated_at').notNull(),
    updatedBy: text('updated_by').notNull(),
    deletedAt: integer('deleted_at'),
  },
  (table) => [index('lineups_map').on(table.map)],
);

/** One counter per map, so an edit only invalidates its own map's ETag and cache. */
export const lineupRevisions = sqliteTable('lineup_revisions', {
  map: text('map').primaryKey(),
  revision: integer('revision').notNull(),
});

/** Append-only log of every write, for the admin Worker's history. */
export const lineupChanges = sqliteTable(
  'lineup_changes',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    lineupId: text('lineup_id').notNull(),
    map: text('map').notNull(),
    action: text('action').notNull(),
    actor: text('actor').notNull(),
    at: integer('at').notNull(),
    body: text('body'),
  },
  (table) => [index('lineup_changes_lineup').on(table.lineupId, table.at)],
);

/** Which stored photo a copied link became, so a re-imported file's links are recognised. */
export const photoLinks = sqliteTable('photo_links', {
  url: text('url').primaryKey(),
  sha256: text('sha256').notNull(),
  createdAt: integer('created_at').notNull(),
});
