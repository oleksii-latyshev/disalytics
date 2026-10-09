import type { AdminConfigShape } from '../config';
import { createKeyCache, fetchJwks, type KeyCache, verifyAccessJwt } from './verify';

export type Identity =
  | { readonly ok: true; readonly email: string }
  | { readonly ok: false; readonly status: 401 | 403 };

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);
const caches = new Map<string, KeyCache>();

function keysFor(teamDomain: string): KeyCache {
  let cache = caches.get(teamDomain);
  if (cache === undefined) {
    cache = createKeyCache(() => fetchJwks(teamDomain, fetch));
    caches.set(teamDomain, cache);
  }
  return cache;
}

function isAccessDomain(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Who is calling. The dev identity is a convenience for `wrangler dev` and nothing else: it needs
 * `ALLOW_DEV_IDENTITY` (a `.dev.vars` entry, not part of the deployed config) *and* a localhost
 * host, and a deployed Worker is reached on its own `workers.dev` host, never a localhost one.
 *
 * Unset `TEAM_DOMAIN` or `POLICY_AUD` is 403, not a pass: until the owner has enabled Access there
 * is nothing to verify against, and the Worker refuses everything.
 */
export async function resolveIdentity(
  request: { readonly url: string; readonly token: string | undefined },
  config: AdminConfigShape,
): Promise<Identity> {
  const dev = config.devIdentity;
  if (dev !== undefined && dev.length > 0 && LOCAL_HOSTS.has(new URL(request.url).hostname)) {
    return { ok: true, email: dev };
  }

  const teamDomain = config.teamDomain.trim();
  const audience = config.audience.trim();
  if (!isAccessDomain(teamDomain) || audience.length === 0) return { ok: false, status: 403 };

  if (request.token === undefined || request.token.length === 0) return { ok: false, status: 401 };

  try {
    const result = await verifyAccessJwt(
      request.token,
      { teamDomain, audience },
      config.keys ?? keysFor(teamDomain),
      Math.floor(config.now() / 1000),
    );
    return result.ok ? { ok: true, email: result.email } : { ok: false, status: 401 };
  } catch {
    return { ok: false, status: 401 };
  }
}
