import type { RequestContext } from '../../shared/cloudflare/bindings';
import { withCors } from '../../shared/http/cors';
import { cached, conditional } from '../../shared/http/edge-cache';
import { jsonResponse } from '../../shared/http/response';
import { isPhotoHash, readPhoto } from './helpers/storage';

export async function routePhotos(
  request: Request,
  hash: string,
  context: RequestContext,
): Promise<Response> {
  if (request.method !== 'GET') {
    return jsonResponse({ error: 'method_not_allowed' }, 405, { Allow: 'GET' });
  }
  if (!isPhotoHash(hash)) return withCors(request, jsonResponse({ error: 'not_found' }, 404));

  const response = await cached(context.cache, context.ctx, new Request(request.url), async () => {
    const photo = await readPhoto(context.env.LINEUP_PHOTOS, hash);
    if (photo === null) return jsonResponse({ error: 'not_found' }, 404);
    return new Response(photo.bytes, {
      headers: {
        'Content-Type': photo.contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
        ETag: `"${hash}"`,
      },
    });
  });
  return withCors(request, conditional(request, response));
}
