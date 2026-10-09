import {
  Actor,
  badRequest,
  forbidden,
  payloadTooLarge,
  SessionAuth,
  unauthorized,
  WriteGuard,
} from '@disa/admin-contract';
import { Effect, Layer, Option } from 'effect';
import { HttpServerRequest } from 'effect/unstable/http';
import { withSession } from './auth/cookie';
import { devActor } from './auth/identity';
import { AdminAuth } from './auth/store';
import { SESSION_COOKIE } from './auth/tokens';
import { AdminConfig } from './config';

export const MAX_BODY_BYTES = 40 * 1024 * 1024;

/**
 * Every request outside `/api/auth/*` needs a live device session; its person becomes the
 * {@link Actor}. A session used after a day's rest has its expiry pushed out, and its cookie is
 * sent again so the browser keeps it as long as the server does.
 */
export const SessionAuthLive = Layer.succeed(SessionAuth, (httpEffect) =>
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest;
    // A middleware cannot demand services, so a request missing them is refused, never let through.
    const config = Option.getOrUndefined(yield* Effect.serviceOption(AdminConfig));
    const auth = Option.getOrUndefined(yield* Effect.serviceOption(AdminAuth));
    if (config === undefined || auth === undefined) return yield* Effect.fail(unauthorized);

    const dev = devActor(request.originalUrl, config.devIdentity);
    if (dev !== null) return yield* Effect.provideService(httpEffect, Actor, dev);

    const token = request.cookies[SESSION_COOKIE];
    if (token === undefined || token.length === 0) return yield* Effect.fail(unauthorized);
    const resolved = yield* auth.resolve(token, config.now()).pipe(Effect.orDie);
    if (resolved === null) return yield* Effect.fail(unauthorized);

    const response = yield* Effect.provideService(httpEffect, Actor, resolved.actor);
    return resolved.touched ? withSession(response, token) : response;
  }),
);

/**
 * Belt and braces next to `SameSite=Strict`: a write must come from this origin, as JSON (which a
 * cross-site form cannot send without a preflight nobody answers), and within the size cap.
 */
export const WriteGuardLive = Layer.succeed(WriteGuard, (httpEffect) =>
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest;
    if (request.method === 'GET' || request.method === 'HEAD') return yield* httpEffect;

    if (request.headers['sec-fetch-site'] === 'cross-site') return yield* Effect.fail(forbidden);
    const length = Number(request.headers['content-length']);
    if (Number.isFinite(length) && length > MAX_BODY_BYTES) {
      return yield* Effect.fail(payloadTooLarge);
    }
    // A body-less POST (signing out) carries nothing to misread; anything else must be JSON.
    const headers = request.headers;
    const empty =
      headers['content-length'] === '0' ||
      (headers['content-length'] === undefined &&
        headers['transfer-encoding'] === undefined &&
        headers['content-type'] === undefined);
    if (
      request.method === 'POST' &&
      !empty &&
      !/^application\/json\b/i.test(request.headers['content-type'] ?? '')
    ) {
      return yield* Effect.fail(
        badRequest('invalid_json', 'Content-Type must be application/json'),
      );
    }
    return yield* httpEffect;
  }),
);
