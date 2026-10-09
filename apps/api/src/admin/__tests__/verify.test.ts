import { describe, expect, it } from 'vitest';
import { resolveIdentity } from '../auth/identity';
import { createKeyCache, type KeyCache, type RsaJwk, verifyAccessJwt } from '../auth/verify';
import type { AdminConfigShape } from '../config';

const TEAM = 'https://team.cloudflareaccess.com';
const AUD = 'aud-tag';
const NOW = 1_800_000_000;

function b64url(input: string | ArrayBuffer): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

async function makeKeyPair() {
  const pair = await crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify'],
  );
  const jwk = await crypto.subtle.exportKey('jwk', pair.publicKey);
  return { pair, jwk };
}

async function sign(
  privateKey: CryptoKey,
  claims: Record<string, unknown>,
  header: Record<string, unknown> = { alg: 'RS256', kid: 'k1' },
): Promise<string> {
  const head = b64url(JSON.stringify(header));
  const body = b64url(JSON.stringify(claims));
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    new TextEncoder().encode(`${head}.${body}`),
  );
  return `${head}.${body}.${b64url(signature)}`;
}

const goodClaims = {
  iss: TEAM,
  aud: [AUD],
  email: 'friend@example.com',
  exp: NOW + 600,
  nbf: NOW - 10,
};

async function setup(kid = 'k1') {
  const { pair, jwk } = await makeKeyPair();
  const published: RsaJwk = { kid, kty: 'RSA', n: jwk.n ?? '', e: jwk.e ?? '' };
  let fetches = 0;
  const keys: KeyCache = createKeyCache(async () => {
    fetches += 1;
    return [published];
  });
  return { pair, keys, fetches: () => fetches };
}

const config = { teamDomain: TEAM, audience: AUD };

describe('verifyAccessJwt', () => {
  it('accepts a valid token and returns the email', async () => {
    const { pair, keys } = await setup();
    const token = await sign(pair.privateKey, goodClaims);
    expect(await verifyAccessJwt(token, config, keys, NOW)).toEqual({
      ok: true,
      email: 'friend@example.com',
    });
  });

  it('accepts aud as a plain string', async () => {
    const { pair, keys } = await setup();
    const token = await sign(pair.privateKey, { ...goodClaims, aud: AUD });
    expect((await verifyAccessJwt(token, config, keys, NOW)).ok).toBe(true);
  });

  it.each([
    ['another audience', { aud: ['other'] }, 'audience'],
    ['another issuer', { iss: 'https://evil.cloudflareaccess.com' }, 'issuer'],
    ['an expired token', { exp: NOW - 60 }, 'expired'],
    ['a token not yet valid', { nbf: NOW + 600 }, 'not_yet_valid'],
    ['no email', { email: undefined }, 'no_email'],
  ])('rejects %s', async (_name, change, reason) => {
    const { pair, keys } = await setup();
    const token = await sign(pair.privateKey, { ...goodClaims, ...change });
    expect(await verifyAccessJwt(token, config, keys, NOW)).toEqual({ ok: false, reason });
  });

  it('rejects a token signed by another key', async () => {
    const { keys } = await setup();
    const other = await makeKeyPair();
    const token = await sign(other.pair.privateKey, goodClaims);
    expect(await verifyAccessJwt(token, config, keys, NOW)).toEqual({
      ok: false,
      reason: 'signature',
    });
  });

  it('rejects a tampered payload', async () => {
    const { pair, keys } = await setup();
    const token = await sign(pair.privateKey, goodClaims);
    const [head, , signature] = token.split('.');
    const forged = `${head}.${b64url(JSON.stringify({ ...goodClaims, email: 'owner@example.com' }))}.${signature}`;
    expect(await verifyAccessJwt(forged, config, keys, NOW)).toEqual({
      ok: false,
      reason: 'signature',
    });
  });

  it('rejects other algorithms and malformed tokens', async () => {
    const { pair, keys } = await setup();
    const none = `${b64url('{"alg":"none","kid":"k1"}')}.${b64url(JSON.stringify(goodClaims))}.`;
    expect((await verifyAccessJwt(none, config, keys, NOW)).ok).toBe(false);
    const hs = await sign(pair.privateKey, goodClaims, { alg: 'HS256', kid: 'k1' });
    expect(await verifyAccessJwt(hs, config, keys, NOW)).toEqual({
      ok: false,
      reason: 'algorithm',
    });
    expect(await verifyAccessJwt('a.b', config, keys, NOW)).toEqual({
      ok: false,
      reason: 'malformed',
    });
  });
});

describe('createKeyCache', () => {
  it('refetches once for an unknown kid, then not again within the interval', async () => {
    const { pair, keys, fetches } = await setup('k1');
    const unknown = await sign(pair.privateKey, goodClaims, { alg: 'RS256', kid: 'nope' });

    expect((await verifyAccessJwt(unknown, config, keys, NOW)).ok).toBe(false);
    expect((await verifyAccessJwt(unknown, config, keys, NOW)).ok).toBe(false);
    expect(fetches()).toBe(1);
  });

  it('serves a known key from memory', async () => {
    const { pair, keys, fetches } = await setup();
    const token = await sign(pair.privateKey, goodClaims);
    await verifyAccessJwt(token, config, keys, NOW);
    await verifyAccessJwt(token, config, keys, NOW);
    expect(fetches()).toBe(1);
  });
});

describe('resolveIdentity', () => {
  const NOW_MS = NOW * 1000;
  const base = (
    overrides: Partial<AdminConfigShape>,
    keys: KeyCache | null = null,
  ): AdminConfigShape => ({
    teamDomain: '',
    audience: '',
    photoBaseUrl: '',
    devIdentity: undefined,
    keys,
    fetchPhoto: null,
    now: () => NOW_MS,
    ...overrides,
  });
  const request = (host: string, token?: string) => ({ url: `https://${host}/api/whoami`, token });

  it('fails closed with 403 while TEAM_DOMAIN or POLICY_AUD is unset', async () => {
    expect(await resolveIdentity(request('x.workers.dev', 'a.b.c'), base({}))).toEqual({
      ok: false,
      status: 403,
    });
    expect(await resolveIdentity(request('x.workers.dev'), base({ teamDomain: TEAM }))).toEqual({
      ok: false,
      status: 403,
    });
    expect(await resolveIdentity(request('x.workers.dev'), base({ audience: AUD }))).toEqual({
      ok: false,
      status: 403,
    });
  });

  it('is 401 without a token or with a bad one once configured', async () => {
    const { keys } = await setup();
    const config = base({ teamDomain: TEAM, audience: AUD }, keys);
    expect(await resolveIdentity(request('x.workers.dev'), config)).toEqual({
      ok: false,
      status: 401,
    });
    expect(await resolveIdentity(request('x.workers.dev', 'a.b.c'), config)).toEqual({
      ok: false,
      status: 401,
    });
  });

  it('takes the email from a verified token', async () => {
    const { pair, keys } = await setup();
    const token = await sign(pair.privateKey, goodClaims);
    const config = base({ teamDomain: TEAM, audience: AUD }, keys);
    expect(await resolveIdentity(request('x.workers.dev', token), config)).toEqual({
      ok: true,
      email: 'friend@example.com',
    });
  });

  it('honours the dev identity on localhost only', async () => {
    const config = base({ devIdentity: 'dev@localhost' });
    expect(await resolveIdentity(request('localhost:8788'), config)).toEqual({
      ok: true,
      email: 'dev@localhost',
    });
    expect(await resolveIdentity(request('127.0.0.1:8788'), config)).toEqual({
      ok: true,
      email: 'dev@localhost',
    });
    expect(await resolveIdentity(request('disalytics-admin.x.workers.dev'), config)).toEqual({
      ok: false,
      status: 403,
    });
  });
});
