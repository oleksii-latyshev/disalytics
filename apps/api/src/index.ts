import { Effect } from 'effect';
import { routeHealth } from './modules/health';
import { routeLineups } from './modules/lineups';
import { routePhotos } from './modules/photos';
import type {
  CacheLike,
  Env,
  ExecutionContextLike,
  RequestContext,
} from './shared/cloudflare/bindings';
import { jsonResponse } from './shared/http/response';

const LINEUPS_PATH = /^\/lineups\/([^/]+)$/;
const PHOTOS_PATH = /^\/photos\/([^/]+)$/;

function isCacheLike(value: unknown): value is CacheLike {
  return (
    typeof value === 'object' &&
    value !== null &&
    'match' in value &&
    'put' in value &&
    typeof value.match === 'function' &&
    typeof value.put === 'function'
  );
}

function edgeCache(): CacheLike | null {
  if (typeof caches === 'undefined' || !('default' in caches)) return null;
  return isCacheLike(caches.default) ? caches.default : null;
}

async function route(request: Request, context: RequestContext): Promise<Response> {
  const path = new URL(request.url).pathname;
  if (path === '/health') {
    return routeHealth(request);
  }
  const lineups = LINEUPS_PATH.exec(path);
  if (lineups?.[1] !== undefined) return routeLineups(request, lineups[1], context);
  const photos = PHOTOS_PATH.exec(path);
  if (photos?.[1] !== undefined) return routePhotos(request, photos[1], context);
  return jsonResponse({ error: 'not_found' }, 404);
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContextLike): Promise<Response> {
    try {
      return await Effect.runPromise(
        Effect.tryPromise(() => route(request, { env, ctx, cache: edgeCache() })),
      );
    } catch {
      return jsonResponse({ error: 'unavailable' }, 503);
    }
  },
};
