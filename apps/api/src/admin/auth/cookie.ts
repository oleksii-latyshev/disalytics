import { Duration } from 'effect';
import { HttpServerResponse } from 'effect/unstable/http';
import { SESSION_COOKIE, SESSION_TTL_MS } from './tokens';

/**
 * `HttpOnly` keeps the token from page scripts; `SameSite=Strict` keeps another site's page from
 * making the browser send it; `__Host-` with `Secure` and `Path=/` pins it to this host.
 */
const OPTIONS = { httpOnly: true, secure: true, sameSite: 'strict', path: '/' } as const;

export function withSession(
  response: HttpServerResponse.HttpServerResponse,
  token: string,
): HttpServerResponse.HttpServerResponse {
  return HttpServerResponse.setCookieUnsafe(response, SESSION_COOKIE, token, {
    ...OPTIONS,
    maxAge: Duration.millis(SESSION_TTL_MS),
  });
}

export function withoutSession(
  response: HttpServerResponse.HttpServerResponse,
): HttpServerResponse.HttpServerResponse {
  return HttpServerResponse.expireCookieUnsafe(response, SESSION_COOKIE, OPTIONS);
}
