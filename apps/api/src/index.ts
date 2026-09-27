import { Effect } from 'effect';

const jsonResponse = (
  body: Record<string, string>,
  status: number,
  headers?: Record<string, string>,
): Response =>
  Response.json(body, {
    headers: {
      'Cache-Control': 'no-store',
      ...headers,
    },
    status,
  });

const handleRequest = (request: Request): Effect.Effect<Response> =>
  Effect.sync(() => {
    const url = new URL(request.url);

    if (url.pathname === '/health') {
      if (request.method !== 'GET') {
        return jsonResponse({ error: 'method_not_allowed' }, 405, { Allow: 'GET' });
      }

      return jsonResponse({ status: 'ok' }, 200);
    }

    return jsonResponse({ error: 'not_found' }, 404);
  });

export default {
  async fetch(request: Request): Promise<Response> {
    return Effect.runPromise(handleRequest(request));
  },
};
