import type { CacheLike, ExecutionContextLike } from '../cloudflare/bindings';

/**
 * Serves `request` from the data center's cache, or builds, stores and returns it. The stored copy
 * carries no per-caller headers (CORS is added afterwards), so one entry serves every origin.
 */
export async function cached(
  cache: CacheLike | null,
  ctx: ExecutionContextLike,
  request: Request,
  build: () => Promise<Response>,
): Promise<Response> {
  if (cache === null) return build();

  const hit = await cache.match(request);
  if (hit !== undefined) return hit;

  const response = await build();
  if (response.status === 200) ctx.waitUntil(cache.put(request, response.clone()));
  return response;
}

/** `304` when the caller already holds `etag`; otherwise the response unchanged. */
export function conditional(request: Request, response: Response): Response {
  const etag = response.headers.get('ETag');
  const sent = request.headers.get('If-None-Match');
  if (etag === null || sent === null) return response;
  if (!sent.split(',').some((tag) => tag.trim() === etag || tag.trim() === '*')) return response;

  const headers = new Headers(response.headers);
  headers.delete('Content-Length');
  headers.delete('Content-Type');
  return new Response(null, { status: 304, headers });
}
