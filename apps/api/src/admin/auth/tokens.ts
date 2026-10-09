/** The device session cookie. `__Host-` pins it to this host, `/` and `Secure`. */
export const SESSION_COOKIE = '__Host-disa_admin';

export const DAY_MS = 24 * 60 * 60 * 1000;
/** A session lives this long past its last use. */
export const SESSION_TTL_MS = 180 * DAY_MS;
/** A session's expiry is pushed out at most once in this long, to keep writes rare. */
export const SESSION_TOUCH_MS = DAY_MS;
export const INVITE_TTL_MS = DAY_MS;

const TOKEN_BYTES = 32;

function base64url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

/** 256 random bits as 43 base64url characters: an invite or a session token. */
export function newToken(): string {
  return base64url(crypto.getRandomValues(new Uint8Array(TOKEN_BYTES)));
}

/** A short random id for a person or a device; not a secret. */
export function newId(): string {
  return base64url(crypto.getRandomValues(new Uint8Array(12)));
}

/** The lowercase hex SHA-256 of a token: what the database keeps instead of the token. */
export async function hashToken(token: string): Promise<string> {
  const digest = new Uint8Array(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)),
  );
  return [...digest].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

const BROWSERS: readonly (readonly [RegExp, string])[] = [
  [/Edg\//, 'Edge'],
  [/OPR\/|Opera/, 'Opera'],
  [/Firefox\//, 'Firefox'],
  [/Chrome\//, 'Chrome'],
  [/Safari\//, 'Safari'],
];
const SYSTEMS: readonly (readonly [RegExp, string])[] = [
  [/iPhone|iPad/, 'iOS'],
  [/Android/, 'Android'],
  [/Windows/, 'Windows'],
  [/Mac OS X|Macintosh/, 'macOS'],
  [/Linux/, 'Linux'],
];

/**
 * "Chrome · macOS" from a User-Agent, so the owner can tell one device from another; empty when
 * neither is recognised, and the page says "unknown device" in the reader's language.
 */
export function deviceLabel(userAgent: string | undefined): string {
  const agent = userAgent ?? '';
  const browser = BROWSERS.find(([pattern]) => pattern.test(agent))?.[1];
  const system = SYSTEMS.find(([pattern]) => pattern.test(agent))?.[1];
  return [browser, system].filter((part) => part !== undefined).join(' · ');
}
