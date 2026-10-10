import { Effect } from 'effect';
import { describe, expect, it } from 'vitest';
import { hasSqlite } from '../../__tests__/sqlite-d1';
import { hintFor } from '../auth/hint-cookie';
import { makeAdminAuth } from '../auth/store';
import { SESSION_COOKIE, SESSION_TTL_MS } from '../auth/tokens';
import { adminEnv, api, NOW } from './support';

const HOST = 'disalytics-admin.disa-67b.workers.dev';
const DOMAIN = 'disa-67b.workers.dev';

describe('hintFor', () => {
  it('moves the hint only for sign-in, sign-out and the whoami answer', () => {
    expect(hintFor('POST', '/api/auth/redeem', 200)).toBe('set');
    expect(hintFor('POST', '/api/auth/redeem', 400)).toBeNull();
    expect(hintFor('POST', '/api/auth/sign-out', 200)).toBe('clear');
    expect(hintFor('GET', '/api/whoami', 200)).toBe('set');
    expect(hintFor('GET', '/api/whoami', 401)).toBe('clear');
    expect(hintFor('GET', '/api/whoami', 500)).toBeNull();
    expect(hintFor('PATCH', '/api/me', 200)).toBeNull();
    expect(hintFor('GET', '/api/lineups/de_mirage', 401)).toBeNull();
  });
});

describe.skipIf(!hasSqlite)('the admin hint cookie', () => {
  const target = () => adminEnv({ ALLOW_DEV_IDENTITY: undefined, ADMIN_HINT_DOMAIN: DOMAIN });
  // The session cookie is `__Host-disa_admin`, so the hint is matched by its whole name.
  const cookiesOf = (response: Response) =>
    response.headers.getSetCookie().filter((cookie) => cookie.startsWith('disa_admin='));

  async function signedIn(env: ReturnType<typeof target>) {
    const created = await Effect.runPromise(
      makeAdminAuth(env.LINEUPS_DB).createInvite({
        role: 'owner',
        personId: undefined,
        createdBy: 'test',
        now: NOW,
      }),
    );
    if (created === null) throw new Error('invite refused');
    const redeemed = await api(env, '/api/auth/redeem', {
      host: HOST,
      body: { token: created.token, name: 'Alex' },
    });
    return redeemed;
  }

  it('is set beside the session cookie on sign-in, readable by the web app', async () => {
    const redeemed = await signedIn(target());
    const hint = cookiesOf(redeemed)[0];
    expect(hint).toContain('disa_admin=1');
    expect(hint).toContain(`Domain=${DOMAIN}`);
    expect(hint).toContain('Path=/');
    expect(hint).toMatch(/Secure/);
    expect(hint).toMatch(/SameSite=Lax/i);
    expect(hint).toContain(`Max-Age=${SESSION_TTL_MS / 1000}`);
    expect(hint).not.toMatch(/HttpOnly/i);

    const session = redeemed.headers
      .getSetCookie()
      .find((cookie) => cookie.startsWith(SESSION_COOKIE));
    expect(session).toMatch(/HttpOnly/i);
    expect(session).toMatch(/SameSite=Strict/i);
    expect(session).not.toMatch(/Domain=/i);
  });

  it('is set again by whoami, and cleared when whoami says 401 or on sign-out', async () => {
    const env = target();
    const redeemed = await signedIn(env);
    const session = /(?:^|, )(__Host-[^=]+=[^;]+)/.exec(
      redeemed.headers.get('set-cookie') ?? '',
    )?.[1];
    if (session === undefined) throw new Error('no session cookie');
    const asDevice = { host: HOST, headers: { Cookie: session } };

    const whoami = await api(env, '/api/whoami', asDevice);
    expect(cookiesOf(whoami).join()).toContain('disa_admin=1');

    const stranger = await api(env, '/api/whoami', { host: HOST });
    expect(stranger.status).toBe(401);
    expect(cookiesOf(stranger).join()).toMatch(/disa_admin=;[^,]*Max-Age=0/);

    const out = await api(env, '/api/auth/sign-out', { ...asDevice, body: {} });
    expect(cookiesOf(out).join()).toMatch(/disa_admin=;[^,]*Max-Age=0/);
  });

  it('is left out where no parent domain is configured', async () => {
    const env = adminEnv({ ALLOW_DEV_IDENTITY: undefined });
    const redeemed = await signedIn(env);
    expect(cookiesOf(redeemed)).toEqual([]);
    const stranger = await api(env, '/api/whoami', { host: HOST });
    expect(cookiesOf(stranger)).toEqual([]);
  });
});
