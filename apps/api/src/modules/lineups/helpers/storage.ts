import { isLineup, type Lineup } from '@disa/demo-core';
import type { D1Like, D1StatementLike } from '../../../shared/cloudflare/bindings';

export interface MapLineups {
  readonly map: string;
  readonly revision: number;
  readonly lineups: readonly Lineup[];
}

interface LineupRow {
  readonly body: string;
}

interface RevisionRow {
  readonly revision: number;
}

function parseBody(body: string): unknown {
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}

/** Live lineups of one map and its revision, read together. Rows that fail `isLineup` are skipped. */
export async function readMapLineups(db: D1Like, map: string): Promise<MapLineups> {
  const [rows, revision] = await Promise.all([
    db
      .prepare(
        'SELECT body FROM lineups WHERE map = ? AND deleted_at IS NULL ORDER BY created_at, id',
      )
      .bind(map)
      .all<LineupRow>(),
    db
      .prepare('SELECT revision FROM lineup_revisions WHERE map = ?')
      .bind(map)
      .first<RevisionRow>(),
  ]);

  const lineups: Lineup[] = [];
  for (const row of rows.results) {
    const entry = parseBody(row.body);
    if (isLineup(entry) && entry.map === map) lineups.push({ ...entry, isBuiltIn: true });
  }
  return { map, revision: revision?.revision ?? 0, lineups };
}

const BUMP_REVISION =
  'INSERT INTO lineup_revisions (map, revision) VALUES (?, 1) ' +
  'ON CONFLICT(map) DO UPDATE SET revision = revision + 1';

const LOG_CHANGE =
  'INSERT INTO lineup_changes (lineup_id, map, action, actor, at, body) VALUES (?, ?, ?, ?, ?, ?)';

export interface LineupWrite {
  readonly lineup: Lineup;
  readonly actor: string;
  readonly now: number;
}

/** Creates or replaces a lineup, logs it and bumps its map's revision in one atomic batch. */
export async function saveLineup(db: D1Like, write: LineupWrite): Promise<void> {
  const { lineup, actor, now } = write;
  const body = JSON.stringify({ ...lineup, isBuiltIn: undefined });
  const statements: D1StatementLike[] = [
    db
      .prepare(
        'INSERT INTO lineups (id, map, body, created_at, created_by, updated_at, updated_by, deleted_at) ' +
          'VALUES (?, ?, ?, ?, ?, ?, ?, NULL) ' +
          'ON CONFLICT(id) DO UPDATE SET map = excluded.map, body = excluded.body, ' +
          'updated_at = excluded.updated_at, updated_by = excluded.updated_by, deleted_at = NULL',
      )
      .bind(lineup.id, lineup.map, body, now, actor, now, actor),
    db.prepare(BUMP_REVISION).bind(lineup.map),
    db.prepare(LOG_CHANGE).bind(lineup.id, lineup.map, 'save', actor, now, body),
  ];
  await db.batch(statements);
}

export interface LineupRemoval {
  readonly id: string;
  readonly actor: string;
  readonly now: number;
}

/** Soft-deletes a lineup. `false` when there is no live lineup with that id. */
export async function deleteLineup(db: D1Like, removal: LineupRemoval): Promise<boolean> {
  const { id, actor, now } = removal;
  const row = await db
    .prepare('SELECT map FROM lineups WHERE id = ? AND deleted_at IS NULL')
    .bind(id)
    .first<{ readonly map: string }>();
  if (row === null) return false;

  await db.batch([
    db
      .prepare('UPDATE lineups SET deleted_at = ?, updated_at = ?, updated_by = ? WHERE id = ?')
      .bind(now, now, actor, id),
    db.prepare(BUMP_REVISION).bind(row.map),
    db.prepare(LOG_CHANGE).bind(id, row.map, 'delete', actor, now, null),
  ]);
  return true;
}
