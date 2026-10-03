import { Effect } from 'effect';
import { routeHealth } from './modules/health';
import { jsonResponse } from './shared/http/response';

async function route(request: Request): Promise<Response> {
  const path = new URL(request.url).pathname;
  if (path === '/health') {
    return routeHealth(request);
  }
  return jsonResponse({ error: 'not_found' }, 404);
}

export default {
  async fetch(request: Request): Promise<Response> {
    try {
      return await Effect.runPromise(Effect.tryPromise(() => route(request)));
    } catch {
      return jsonResponse({ error: 'unavailable' }, 503);
    }
  },
};
