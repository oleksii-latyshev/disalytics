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

/**
 * An id a lineup was known by in someone's file before it was merged into the stored lineup
 * `lineup_id`, so a re-exported file reads as that lineup and not as a new duplicate.
 */
export const lineupAliases = sqliteTable('lineup_aliases', {
  aliasId: text('alias_id').primaryKey(),
  lineupId: text('lineup_id').notNull(),
  createdAt: integer('created_at').notNull(),
});

/** Which stored photo a copied link became, so a re-imported file's links are recognised. */
export const photoLinks = sqliteTable('photo_links', {
  url: text('url').primaryKey(),
  sha256: text('sha256').notNull(),
  createdAt: integer('created_at').notNull(),
});

/** The people who may use the admin. A disabled person keeps their name on past changes. */
export const admins = sqliteTable('admins', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  role: text('role', { enum: ['owner', 'editor'] }).notNull(),
  createdAt: integer('created_at').notNull(),
  disabledAt: integer('disabled_at'),
});

/** One signed-in device. Only the SHA-256 of its cookie token is kept. */
export const adminSessions = sqliteTable(
  'admin_sessions',
  {
    id: text('id').primaryKey(),
    tokenHash: text('token_hash').notNull().unique(),
    adminId: text('admin_id').notNull(),
    label: text('label').notNull(),
    createdAt: integer('created_at').notNull(),
    lastSeenAt: integer('last_seen_at').notNull(),
    expiresAt: integer('expires_at').notNull(),
    revokedAt: integer('revoked_at'),
  },
  (table) => [index('admin_sessions_admin').on(table.adminId)],
);

/**
 * A one-time link. With `admin_id` it adds a device for that person; without, it makes a new
 * person of `role`. Only the SHA-256 of its token is kept.
 */
export const adminInvites = sqliteTable('admin_invites', {
  tokenHash: text('token_hash').primaryKey(),
  role: text('role', { enum: ['owner', 'editor'] }).notNull(),
  adminId: text('admin_id'),
  createdBy: text('created_by').notNull(),
  createdAt: integer('created_at').notNull(),
  expiresAt: integer('expires_at').notNull(),
  usedAt: integer('used_at'),
});
