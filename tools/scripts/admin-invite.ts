import { hashToken, INVITE_TTL_MS, newToken } from '../../apps/api/src/admin/auth/tokens';

/**
 * The way back in when every owner device is gone: whoever holds the Cloudflare account writes an
 * owner invite straight into D1 and gets its link. The token is printed once and only its hash is
 * stored.
 *
 *   bun run admin:invite -- --remote        # production
 *   bun run admin:invite -- --local         # `bun run --cwd apps/api dev:admin`
 */
const DATABASE = 'disalytics-lineups';
const CONFIG = new URL('../../apps/api/wrangler.admin.jsonc', import.meta.url).pathname;
const PRODUCTION = 'https://disalytics-admin.disa-67b.workers.dev';
const LOCAL = 'http://localhost:8788';

const target = process.argv.slice(2).find((arg) => arg === '--local' || arg === '--remote');
if (target === undefined) throw new Error('Usage: bun run admin:invite -- --local | --remote');

const token = newToken();
const now = Date.now();
const expiresAt = now + INVITE_TTL_MS;
// Every value is generated here (hex, a fixed role, integers): nothing from outside reaches the SQL.
const sql =
  'INSERT INTO admin_invites (token_hash, role, admin_id, created_by, created_at, expires_at) ' +
  `VALUES ('${await hashToken(token)}', 'owner', NULL, 'cli', ${now}, ${expiresAt});`;

const run = Bun.spawnSync(
  ['bunx', 'wrangler', 'd1', 'execute', DATABASE, target, '--config', CONFIG, '--command', sql],
  { stdout: 'ignore', stderr: 'inherit' },
);
if (run.exitCode !== 0) process.exit(run.exitCode);

const base = target === '--remote' ? PRODUCTION : LOCAL;
console.log(`Owner invite, single use, valid until ${new Date(expiresAt).toISOString()}:`);
console.log(`${base}/#invite=${token}`);
