import type { ActorShape } from '@disa/admin-contract';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * The `wrangler dev` stand-in for a signed-in owner, and nothing else: it needs
 * `ALLOW_DEV_IDENTITY` (a `.dev.vars` entry, never in `wrangler.admin.jsonc`) *and* a localhost
 * host, and a deployed Worker is reached on its own `workers.dev` host, never a localhost one.
 */
export function devActor(url: string, devIdentity: string | undefined): ActorShape | null {
  if (devIdentity === undefined || devIdentity.length === 0) return null;
  if (!LOCAL_HOSTS.has(new URL(url).hostname)) return null;
  return { id: 'dev', name: devIdentity, role: 'owner', steamUrl: null, sessionId: null };
}
