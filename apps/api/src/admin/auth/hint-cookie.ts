import { SESSION_TTL_MS } from './tokens';

export const HINT_COOKIE = 'disa_admin';

/**
 * A hint for the web app, which lives on a sibling host of the same site: "this browser is signed in
 * to the admin". Deliberately readable by scripts and shared across the parent domain; it grants
 * nothing, the session cookie is the only credential. Set only where a parent domain is configured.
 */
export function hintCookie(domain: string): string {
  return `${HINT_COOKIE}=1; Domain=${domain}; Path=/; Secure; SameSite=Lax; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`;
}

export function clearedHintCookie(domain: string): string {
  return `${HINT_COOKIE}=; Domain=${domain}; Path=/; Secure; SameSite=Lax; Max-Age=0`;
}

/**
 * Which way the hint moves for an answered request: signing in (a redeemed invite or a whoami that
 * knows the device) sets it; signing out, or a whoami that does not, clears it.
 */
export function hintFor(method: string, pathname: string, status: number): 'set' | 'clear' | null {
  if (pathname === '/api/auth/redeem' && method === 'POST') return status === 200 ? 'set' : null;
  if (pathname === '/api/auth/sign-out' && method === 'POST') return 'clear';
  if (pathname === '/api/whoami' && method === 'GET') {
    if (status === 200) return 'set';
    if (status === 401) return 'clear';
  }
  return null;
}

export function withHint(
  request: Request,
  response: Response,
  domain: string | undefined,
): Response {
  if (domain === undefined || domain === '') return response;
  const move = hintFor(request.method, new URL(request.url).pathname, response.status);
  if (move === null) return response;
  const next = new Response(response.body, response);
  next.headers.append(
    'Set-Cookie',
    move === 'set' ? hintCookie(domain) : clearedHintCookie(domain),
  );
  return next;
}
