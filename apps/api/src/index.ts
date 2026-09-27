import { Effect } from 'effect';
import { routeHealth } from './modules/health';
import { routeUpload, type UploadEnv, unavailableUploadResponse } from './modules/upload';
import { jsonResponse } from './shared/http/response';

async function route(request: Request, env: UploadEnv): Promise<Response> {
  const path = new URL(request.url).pathname;
  if (path === '/health') {
    return routeHealth(request);
  }
  if (path === '/images/config' || path === '/images/upload') {
    return routeUpload(request, env);
  }
  return jsonResponse({ error: 'not_found' }, 404);
}

export default {
  async fetch(request: Request, env: UploadEnv = {}): Promise<Response> {
    try {
      return await Effect.runPromise(Effect.tryPromise(() => route(request, env)));
    } catch {
      return unavailableUploadResponse(request);
    }
  },
};
