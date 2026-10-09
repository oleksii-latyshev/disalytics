import { Effect } from 'effect';
import { describe, expect, it } from 'vitest';
import { hasSqlite } from '../../__tests__/sqlite-d1';
import { makeAdminAuth } from '../auth/store';
import { DAY_MS, deviceLabel, SESSION_COOKIE } from '../auth/tokens';
import { adminEnv, api, NOW } from './support';

const HOST = 'admin.example.workers.dev';
const CHROME_MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36';

/** A deployed-looking env: no dev identity, so every request must carry a session. */
function env() {
  return adminEnv({ ALLOW_DEV_IDENTITY: undefined });
}

async function invite(
  target: ReturnType<typeof env>,
  role: 'owner' | 'editor' = 'owner',
  personId?: string,
  now = NOW,
) {
  const created = await Effect.runPromise(
    makeAdminAuth(target.LINEUPS_DB).createInvite({ role, personId, createdBy: 'test', now }),
  );
  if (created === null) throw new Error('invite refused');
  return created.token;
}

function sessionOf(response: Response): string {
  const cookie = response.headers.get('set-cookie') ?? '';
  const match = new RegExp(`${SESSION_COOKIE}=([^;]+)`).exec(cookie);
  if (match?.[1] === undefined) throw new Error(`no session cookie in "${cookie}"`);
  return match[1];
}

const asDevice = (cookie: string) => ({
  host: HOST,
  headers: { Cookie: `${SESSION_COOKIE}=${cookie}` },
});

describe.skipIf(!hasSqlite)('invite links', () => {
  it('tells what an invite will do without spending it', async () => {
    const target = env();
    const token = await invite(target, 'editor');
    for (let i = 0; i < 2; i += 1) {
      const info = await api(target, '/api/auth/invite', { host: HOST, body: { token } });
      expect(info.status).toBe(200);
      expect(await info.json()).toEqual({ role: 'editor', expiresAt: NOW + DAY_MS });
    }
  });

  it('gives the device a session cookie, once', async () => {
    const target = env();
    const token = await invite(target);
    const redeemed = await api(target, '/api/auth/redeem', {
      host: HOST,
      body: { token, name: '  Alex  ' },
      headers: { 'User-Agent': CHROME_MAC },
    });
    expect(redeemed.status).toBe(200);
    const me = (await redeemed.json()) as { id: string; name: string; role: string };
    expect(me).toMatchObject({ name: 'Alex', role: 'owner' });

    const cookie = redeemed.headers.get('set-cookie') ?? '';
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/Secure/i);
    expect(cookie).toMatch(/SameSite=Strict/i);
    expect(cookie).toMatch(/Path=\//i);

    const whoami = await api(target, '/api/whoami', asDevice(sessionOf(redeemed)));
    expect(await whoami.json()).toEqual(me);

    const again = await api(target, '/api/auth/redeem', {
      host: HOST,
      body: { token, name: 'Eve' },
    });
    expect(again.status).toBe(400);
    expect(await again.json()).toMatchObject({ error: 'invalid_invite' });
  });

  it('asks a new person for a name before spending the invite', async () => {
    const target = env();
    const token = await invite(target);
    const nameless = await api(target, '/api/auth/redeem', { host: HOST, body: { token } });
    expect(nameless.status).toBe(400);
    expect(await nameless.json()).toMatchObject({ error: 'name_required' });
    const named = await api(target, '/api/auth/redeem', {
      host: HOST,
      body: { token, name: 'Alex' },
    });
    expect(named.status).toBe(200);
  });

  it('refuses an expired or unknown invite', async () => {
    const target = env();
    const old = await invite(target, 'owner', undefined, NOW - 2 * DAY_MS);
    const expired = await api(target, '/api/auth/redeem', {
      host: HOST,
      body: { token: old, name: 'Alex' },
    });
    expect(await expired.json()).toMatchObject({ error: 'invalid_invite' });
    const unknown = await api(target, '/api/auth/redeem', {
      host: HOST,
      body: { token: 'A'.repeat(43), name: 'Alex' },
    });
    expect(await unknown.json()).toMatchObject({ error: 'invalid_invite' });
  });

  it('adds a device to an existing person, keeping their name and role', async () => {
    const target = env();
    const first = await api(target, '/api/auth/redeem', {
      host: HOST,
      body: { token: await invite(target, 'editor'), name: 'Sam' },
    });
    const sam = (await first.json()) as { id: string };
    const device = await invite(target, 'owner', sam.id);
    const info = await api(target, '/api/auth/invite', { host: HOST, body: { token: device } });
    expect(await info.json()).toMatchObject({ role: 'editor', name: 'Sam' });
    const second = await api(target, '/api/auth/redeem', {
      host: HOST,
      body: { token: device, name: 'Ignored' },
    });
    expect(await second.json()).toEqual({ id: sam.id, name: 'Sam', role: 'editor' });
  });
});

describe.skipIf(!hasSqlite)('sessions and people', () => {
  async function signIn(target: ReturnType<typeof env>, role: 'owner' | 'editor', name: string) {
    const response = await api(target, '/api/auth/redeem', {
      host: HOST,
      body: { token: await invite(target, role), name },
      headers: { 'User-Agent': CHROME_MAC },
    });
    const me = (await response.json()) as { id: string };
    return { id: me.id, cookie: sessionOf(response) };
  }

  it('signs a device out', async () => {
    const target = env();
    const { cookie } = await signIn(target, 'owner', 'Alex');
    const out = await api(target, '/api/auth/sign-out', { ...asDevice(cookie), body: {} });
    expect(out.status).toBe(200);
    expect(out.headers.get('set-cookie')).toMatch(/Max-Age=0|Expires=/i);
    expect((await api(target, '/api/whoami', asDevice(cookie))).status).toBe(401);
  });

  it('keeps people management to the owner', async () => {
    const target = env();
    const editor = await signIn(target, 'editor', 'Sam');
    expect((await api(target, '/api/people', asDevice(editor.cookie))).status).toBe(403);
    const invited = await api(target, '/api/people/invites', {
      ...asDevice(editor.cookie),
      body: { role: 'owner' },
    });
    expect(invited.status).toBe(403);
  });

  it('lists people with their devices, revokes a device and disables a person', async () => {
    const target = env();
    const owner = await signIn(target, 'owner', 'Alex');
    const editor = await signIn(target, 'editor', 'Sam');

    const listed = (await (await api(target, '/api/people', asDevice(owner.cookie))).json()) as {
      people: {
        id: string;
        name: string;
        devices: { id: string; label: string; current: boolean }[];
      }[];
    };
    expect(listed.people.map((person) => person.name)).toEqual(['Alex', 'Sam']);
    expect(listed.people[0]?.devices[0]).toMatchObject({ label: 'Chrome · macOS', current: true });

    const samDevice = listed.people[1]?.devices[0]?.id ?? '';
    const revoke = await api(target, `/api/people/devices/${samDevice}`, {
      ...asDevice(owner.cookie),
      method: 'DELETE',
    });
    expect(revoke.status).toBe(200);
    expect((await api(target, '/api/whoami', asDevice(editor.cookie))).status).toBe(401);

    const link = await api(target, '/api/people/invites', {
      ...asDevice(owner.cookie),
      body: { role: 'editor', personId: editor.id },
    });
    expect(link.status).toBe(200);

    const disable = await api(target, `/api/people/${editor.id}`, {
      ...asDevice(owner.cookie),
      method: 'DELETE',
    });
    expect(disable.status).toBe(200);
    const { token } = (await link.json()) as { token: string };
    const redeem = await api(target, '/api/auth/redeem', { host: HOST, body: { token } });
    expect(await redeem.json()).toMatchObject({ error: 'invalid_invite' });
  });

  it('never disables the last owner', async () => {
    const target = env();
    const owner = await signIn(target, 'owner', 'Alex');
    const response = await api(target, `/api/people/${owner.id}`, {
      ...asDevice(owner.cookie),
      method: 'DELETE',
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: 'last_owner' });
  });

  it('extends a session used after a day, and resends its cookie', async () => {
    const target = env();
    const { cookie } = await signIn(target, 'owner', 'Alex');
    const sameDay = await api(target, '/api/whoami', asDevice(cookie), { now: () => NOW + 1000 });
    expect(sameDay.headers.get('set-cookie')).toBeNull();
    const later = await api(target, '/api/whoami', asDevice(cookie), {
      now: () => NOW + 2 * DAY_MS,
    });
    expect(later.headers.get('set-cookie')).toContain(`${SESSION_COOKIE}=${cookie}`);
    const lapsed = await api(target, '/api/whoami', asDevice(cookie), {
      now: () => NOW + 400 * DAY_MS,
    });
    expect(lapsed.status).toBe(401);
  });
});

describe('device labels', () => {
  it('names the browser and system, and is empty when it knows neither', () => {
    expect(deviceLabel(CHROME_MAC)).toBe('Chrome · macOS');
    expect(
      deviceLabel(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0',
      ),
    ).toBe('Firefox · Windows');
    expect(deviceLabel(undefined)).toBe('');
  });
});

describe.skipIf(!hasSqlite)('the write guard and a body-less POST', () => {
  it('lets signing out through without a body, and still refuses a non-JSON one', async () => {
    const target = env();
    const empty = await api(target, '/api/auth/sign-out', {
      method: 'POST',
      host: HOST,
      headers: { 'Content-Length': '0' },
    });
    expect(empty.status).toBe(200);
    const text = await api(target, '/api/auth/sign-out', {
      method: 'POST',
      host: HOST,
      headers: { 'Content-Type': 'text/plain' },
    });
    expect(text.status).toBe(400);
  });
});
