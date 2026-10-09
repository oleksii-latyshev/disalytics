/**
 * Verifies a Cloudflare Access JWT (`Cf-Access-Jwt-Assertion`) with WebCrypto: RS256 against the
 * team's published keys. https://developers.cloudflare.com/cloudflare-one/identity/authorization-cookie/validating-json/
 */

export interface AccessConfig {
  /** `https://<team>.cloudflareaccess.com`; also the token's expected `iss`. */
  readonly teamDomain: string;
  readonly audience: string;
}

export interface RsaJwk {
  readonly kid: string;
  readonly kty: 'RSA';
  readonly n: string;
  readonly e: string;
}

export type VerifyResult =
  | { readonly ok: true; readonly email: string }
  | { readonly ok: false; readonly reason: string };

export interface KeyCache {
  /** The key for `kid`, fetching the set again when it is unknown (at most once per interval). */
  get(kid: string): Promise<CryptoKey | null>;
}

const RSA_PARAMS = { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' } as const;
const REFETCH_INTERVAL_MS = 60_000;
const CLOCK_LEEWAY_SECONDS = 5;
const JWKS_TIMEOUT_MS = 5_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function base64UrlBytes(value: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  const padded = value
    .replaceAll('-', '+')
    .replaceAll('_', '/')
    .padEnd(Math.ceil(value.length / 4) * 4, '=');
  try {
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  } catch {
    return null;
  }
}

function base64UrlJson(value: string): Record<string, unknown> | null {
  const bytes = base64UrlBytes(value);
  if (bytes === null) return null;
  try {
    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function parseJwks(value: unknown): RsaJwk[] {
  if (!isRecord(value) || !Array.isArray(value.keys)) return [];
  const keys: RsaJwk[] = [];
  for (const entry of value.keys) {
    if (
      isRecord(entry) &&
      entry.kty === 'RSA' &&
      typeof entry.kid === 'string' &&
      typeof entry.n === 'string' &&
      typeof entry.e === 'string'
    ) {
      keys.push({ kid: entry.kid, kty: 'RSA', n: entry.n, e: entry.e });
    }
  }
  return keys;
}

/** Fetches the team's key set; an unreachable or malformed answer is an empty set. */
export async function fetchJwks(teamDomain: string, fetchImpl: typeof fetch): Promise<RsaJwk[]> {
  try {
    const response = await fetchImpl(`${teamDomain}/cdn-cgi/access/certs`, {
      signal: AbortSignal.timeout(JWKS_TIMEOUT_MS),
    });
    if (!response.ok) return [];
    return parseJwks(await response.json());
  } catch {
    return [];
  }
}

/**
 * Keys are kept in memory for the life of the isolate. A `kid` the cache does not know triggers one
 * refetch, but never more than one a minute, so a forged `kid` cannot turn this Worker into a way to
 * hammer the team's key endpoint.
 */
export function createKeyCache(
  load: () => Promise<readonly RsaJwk[]>,
  now: () => number = Date.now,
): KeyCache {
  const keys = new Map<string, CryptoKey>();
  let lastFetch = Number.NEGATIVE_INFINITY;
  let pending: Promise<void> | null = null;

  async function refresh(): Promise<void> {
    lastFetch = now();
    const jwks = await load();
    for (const jwk of jwks) {
      try {
        const key = await crypto.subtle.importKey(
          'jwk',
          { kty: 'RSA', n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
          RSA_PARAMS,
          false,
          ['verify'],
        );
        keys.set(jwk.kid, key);
      } catch {
        // A malformed key is skipped; the rest of the set still works.
      }
    }
  }

  return {
    async get(kid) {
      const known = keys.get(kid);
      if (known !== undefined) return known;
      if (now() - lastFetch < REFETCH_INTERVAL_MS && pending === null) return null;
      pending ??= refresh().finally(() => {
        pending = null;
      });
      await pending;
      return keys.get(kid) ?? null;
    },
  };
}

function audienceMatches(aud: unknown, audience: string): boolean {
  if (typeof aud === 'string') return aud === audience;
  return Array.isArray(aud) && aud.some((entry) => entry === audience);
}

function normaliseDomain(domain: string): string {
  return domain.replace(/\/+$/, '');
}

function checkClaims(
  payload: Record<string, unknown>,
  config: AccessConfig,
  nowSeconds: number,
): VerifyResult {
  if (
    typeof payload.iss !== 'string' ||
    normaliseDomain(payload.iss) !== normaliseDomain(config.teamDomain)
  ) {
    return { ok: false, reason: 'issuer' };
  }
  if (!audienceMatches(payload.aud, config.audience)) return { ok: false, reason: 'audience' };
  if (typeof payload.exp !== 'number' || payload.exp + CLOCK_LEEWAY_SECONDS <= nowSeconds) {
    return { ok: false, reason: 'expired' };
  }
  if (typeof payload.nbf === 'number' && payload.nbf - CLOCK_LEEWAY_SECONDS > nowSeconds) {
    return { ok: false, reason: 'not_yet_valid' };
  }
  if (typeof payload.email !== 'string' || payload.email.length === 0) {
    return { ok: false, reason: 'no_email' };
  }
  return { ok: true, email: payload.email };
}

export async function verifyAccessJwt(
  token: string,
  config: AccessConfig,
  keys: KeyCache,
  nowSeconds: number,
): Promise<VerifyResult> {
  const parts = token.split('.');
  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  if (
    parts.length !== 3 ||
    encodedHeader === undefined ||
    encodedPayload === undefined ||
    encodedSignature === undefined
  ) {
    return { ok: false, reason: 'malformed' };
  }

  const header = base64UrlJson(encodedHeader);
  const payload = base64UrlJson(encodedPayload);
  const signature = base64UrlBytes(encodedSignature);
  if (header === null || payload === null || signature === null) {
    return { ok: false, reason: 'malformed' };
  }
  if (header.alg !== 'RS256' || typeof header.kid !== 'string') {
    return { ok: false, reason: 'algorithm' };
  }

  const key = await keys.get(header.kid);
  if (key === null) return { ok: false, reason: 'unknown_key' };
  const signed = new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`);
  const valid = await crypto.subtle.verify(RSA_PARAMS, key, signature, signed);
  if (!valid) return { ok: false, reason: 'signature' };

  return checkClaims(payload, config, nowSeconds);
}
