import type { RequestContext } from '../../shared/cloudflare/bindings';
import { withCors } from '../../shared/http/cors';
import { cached, conditional } from '../../shared/http/edge-cache';
import { jsonResponse } from '../../shared/http/response';
import { LINEUPS_CACHE_CONTROL, MAP_ID } from './constants';
import { readMapLineups } from './helpers/storage';

export async function routeLineups(
  request: Request,
  map: string,
  context: RequestContext,
): Promise<Response> {
  if (request.method !== 'GET') {
    return jsonResponse({ error: 'method_not_allowed' }, 405, { Allow: 'GET' });
  }
  if (!MAP_ID.test(map)) return withCors(request, jsonResponse({ error: 'not_found' }, 404));

  const response = await cached(context.cache, context.ctx, new Request(request.url), async () => {
    const { revision, lineups } = await readMapLineups(context.env.LINEUPS_DB, map);
    return Response.json(
      { map, revision, lineups },
      { headers: { 'Cache-Control': LINEUPS_CACHE_CONTROL, ETag: `"${map}-${revision}"` } },
    );
  });
  return withCors(request, conditional(request, response));
}
