import { handleApi } from './app';
import type { AdminEnv } from './env';

/**
 * The admin Worker. `/api/*` is ours (`run_worker_first`); every other path is answered by the
 * static assets before this code runs, and is handed on here only as a fallback.
 */
export default {
  fetch(request: Request, env: AdminEnv): Promise<Response> {
    const { pathname } = new URL(request.url);
    return pathname === '/api' || pathname.startsWith('/api/')
      ? handleApi(request, env)
      : env.ASSETS.fetch(request);
  },
};
