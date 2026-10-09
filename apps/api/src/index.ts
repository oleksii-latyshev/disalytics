import { type Env, handle } from './app';

export default {
  fetch: (request: Request, env: Env): Promise<Response> =>
    handle(request, env, typeof caches === 'undefined' ? null : caches.default),
};
