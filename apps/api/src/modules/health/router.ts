import { jsonResponse } from '../../shared/http/response';

export function routeHealth(request: Request): Response {
  if (request.method !== 'GET') {
    return jsonResponse({ error: 'method_not_allowed' }, 405, { Allow: 'GET' });
  }
  return jsonResponse({ status: 'ok' }, 200);
}
