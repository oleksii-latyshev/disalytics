import {
  AccessAuth,
  Actor,
  badRequest,
  forbidden,
  payloadTooLarge,
  unauthorized,
  WriteGuard,
} from '@disa/admin-contract';
import { Effect, Layer, Option } from 'effect';
import { HttpServerRequest } from 'effect/unstable/http';
import { resolveIdentity } from './auth/identity';
import { AdminConfig } from './config';

export const MAX_BODY_BYTES = 40 * 1024 * 1024;

/** Every request must carry a valid Access token; the verified email becomes the {@link Actor}. */
export const AccessAuthLive = Layer.succeed(AccessAuth, (httpEffect) =>
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest;
    const config = Option.getOrUndefined(yield* Effect.serviceOption(AdminConfig));
    if (config === undefined) return yield* Effect.fail(forbidden);

    const identity = yield* Effect.promise(() =>
      resolveIdentity(
        { url: request.originalUrl, token: request.headers['cf-access-jwt-assertion'] },
        config,
      ),
    );
    if (!identity.ok) return yield* Effect.fail(identity.status === 401 ? unauthorized : forbidden);
    return yield* Effect.provideService(httpEffect, Actor, { email: identity.email });
  }),
);

/**
 * A page on another site can make the browser attach the Access cookie, which Access turns into a
 * valid token; so a write must come from this origin, as JSON (which a cross-site form cannot
 * send without a preflight Access would refuse), and within the size cap.
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
    if (
      request.method === 'POST' &&
      !/^application\/json\b/i.test(request.headers['content-type'] ?? '')
    ) {
      return yield* Effect.fail(
        badRequest('invalid_json', 'Content-Type must be application/json'),
      );
    }
    return yield* httpEffect;
  }),
);
