import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isLineup, type Lineup } from '@disa/demo-core';

const DATABASE = 'disalytics-lineups';
const LINEUPS_DIR = new URL('../../packages/map-data/src/lineups/', import.meta.url);
const CONFIG = new URL('../../apps/api/wrangler.jsonc', import.meta.url).pathname;

const target = process.argv.slice(2).find((arg) => arg === '--local' || arg === '--remote');
const printOnly = process.argv.includes('--print');
if (target === undefined && !printOnly) {
  throw new Error('Usage: bun run lineups:seed -- --local | --remote | --print');
}

function quote(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function bundledLineups(): Lineup[] {
  const found: Lineup[] = [];
  for (const name of readdirSync(LINEUPS_DIR).filter((file) => file.endsWith('.json'))) {
    const entries: unknown = JSON.parse(readFileSync(new URL(name, LINEUPS_DIR), 'utf8'));
    if (!Array.isArray(entries)) throw new Error(`${name} is not an array`);
    for (const entry of entries) {
      if (!isLineup(entry)) throw new Error(`${name} holds an invalid lineup`);
      found.push(entry);
    }
  }
  return found;
}

/**
 * INSERT OR IGNORE: seeding again never overwrites an edit made through the admin. Each map's
 * revision is bumped so caches drop what they hold.
 */
function seedSql(lineups: readonly Lineup[]): string {
  const now = Date.now();
  const statements = lineups.map((lineup) => {
    const body = JSON.stringify({ ...lineup, isBuiltIn: undefined });
    return (
      'INSERT OR IGNORE INTO lineups (id, map, body, created_at, created_by, updated_at, updated_by) ' +
      `VALUES (${quote(lineup.id)}, ${quote(lineup.map)}, ${quote(body)}, ${lineup.createdAt}, 'seed', ${now}, 'seed');`
    );
  });
  for (const map of new Set(lineups.map((lineup) => lineup.map))) {
    statements.push(
      `INSERT INTO lineup_revisions (map, revision) VALUES (${quote(map)}, 1) ` +
        'ON CONFLICT(map) DO UPDATE SET revision = revision + 1;',
    );
  }
  return `${statements.join('\n')}\n`;
}

const sql = seedSql(bundledLineups());
if (printOnly) {
  process.stdout.write(sql);
} else {
  const file = join(mkdtempSync(join(tmpdir(), 'lineups-seed-')), 'seed.sql');
  writeFileSync(file, sql);
  const run = Bun.spawnSync(
    [
      'bunx',
      'wrangler',
      'd1',
      'execute',
      DATABASE,
      target ?? '--local',
      '--config',
      CONFIG,
      '--file',
      file,
    ],
    { stdout: 'inherit', stderr: 'inherit' },
  );
  if (run.exitCode !== 0) process.exit(run.exitCode);
}
