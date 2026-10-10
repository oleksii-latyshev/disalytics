import { Context, Effect, Option } from 'effect';
import { HttpMiddleware, HttpServerRequest, HttpServerResponse } from 'effect/unstable/http';

const WEB_ORIGIN = 'https://disalytics.disa-67b.workers.dev';
const LOCAL_ORIGIN = /^http:\/\/(?:localhost|127\.0\.0\.1):\d{1,5}$/;

/** GET from the web app or a local dev server; any other origin gets no CORS headers. */
export const cors = HttpMiddleware.cors({
  allowedOrigins: (origin) => origin === WEB_ORIGIN || LOCAL_ORIGIN.test(origin),
  allowedMethods: ['GET'],
});

/** The slice of Cloudflare's Cache API used here; `caches.default` satisfies it. */
export interface CacheBinding {
  match(request: Request): Promise<Response | undefined>;
  put(request: Request, response: Response): Promise<void>;
}

/** Cloudflare's per-data-center cache. Absent in tests and local Node runs, where nothing is cached. */
export class EdgeCache extends Context.Service<EdgeCache, CacheBinding>()('disalytics/EdgeCache') {}

const CACHED_PATH = /^\/(?:lineups(?:\/|$)|photos\/)/;

/**
 * Serves GETs of lineups and photos from the edge cache, or stores the 200 it builds. The stored
 * copy is taken before CORS is added, so one entry serves every origin.
 */
export const edgeCache = HttpMiddleware.make((app) =>
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest;
    const cache = yield* Effect.serviceOption(EdgeCache);
    const path = new URL(request.url, 'http://worker').pathname;
    if (Option.isNone(cache) || request.method !== 'GET' || !CACHED_PATH.test(path))
      return yield* app;

    const key = new Request(request.originalUrl);
    const hit = yield* Effect.promise(() => cache.value.match(key));
    if (hit !== undefined) return HttpServerResponse.fromWeb(hit);

    const response = yield* app;
    if (response.status !== 200) return response;
    const web = HttpServerResponse.toWeb(response);
    yield* Effect.promise(() => cache.value.put(key, web.clone()));
    return HttpServerResponse.fromWeb(web);
  }),
);

/** `304` when the caller already holds the response's ETag. */
export const conditional = HttpMiddleware.make((app) =>
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest;
    const response = yield* app;
    const etag = response.headers.etag;
    const held = request.headers['if-none-match'];
    if (etag === undefined || held === undefined) return response;
    const matches = held.split(',').some((tag) => tag.trim() === etag || tag.trim() === '*');
    return matches
      ? HttpServerResponse.empty({
          status: 304,
          headers: { etag, 'cache-control': response.headers['cache-control'] ?? '' },
        })
      : response;
  }),
);

/** CORS, then the conditional `304`, then the edge cache around the route. */
export const edge = HttpMiddleware.make((app) => cors(conditional(edgeCache(app))));
