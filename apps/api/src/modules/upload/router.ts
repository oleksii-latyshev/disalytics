import { jsonResponse } from '../../shared/http/response';
import { MAX_BODY_BYTES } from './constants';
import { uploadToCatbox } from './helpers/catbox';
import { allowedOrigin, corsHeaders } from './helpers/cors';
import { expectedUploadFields, validWebp } from './helpers/image';
import { readLimitedBody } from './helpers/limited-body';
import { validChallenge } from './helpers/turnstile';
import { configuredUploadEnv, type UploadEnv } from './types';

async function uploadImage(
  request: Request,
  env: UploadEnv,
  headers: Record<string, string>,
): Promise<Response> {
  const config = configuredUploadEnv(env);
  if (!config) return jsonResponse({ error: 'upload_unavailable' }, 503, headers);

  const contentType = request.headers.get('Content-Type');
  if (!contentType?.startsWith('multipart/form-data;')) {
    return jsonResponse({ error: 'invalid_request' }, 415, headers);
  }
  if (Number(request.headers.get('Content-Length')) > MAX_BODY_BYTES) {
    return jsonResponse({ error: 'image_too_large' }, 413, headers);
  }

  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  const allowance = await config.UPLOAD_RATE_LIMITER.limit({ key: ip });
  if (!allowance.success) return jsonResponse({ error: 'rate_limited' }, 429, headers);

  const bytes = await readLimitedBody(request);
  if (!bytes) return jsonResponse({ error: 'image_too_large' }, 413, headers);
  let form: FormData;
  try {
    form = await new Request(request.url, {
      method: 'POST',
      headers: { 'Content-Type': contentType },
      body: bytes,
    }).formData();
  } catch {
    return jsonResponse({ error: 'invalid_request' }, 400, headers);
  }
  if (!expectedUploadFields(form)) {
    return jsonResponse({ error: 'invalid_request' }, 400, headers);
  }

  const file = form.get('image');
  if (!(file instanceof File) || !(await validWebp(file))) {
    return jsonResponse({ error: 'invalid_image' }, 400, headers);
  }
  if (!(await validChallenge(form.get('turnstile'), config.TURNSTILE_SECRET))) {
    return jsonResponse({ error: 'verification_failed' }, 403, headers);
  }

  const url = await uploadToCatbox(file, config.CATBOX_USERHASH);
  return url
    ? jsonResponse({ url }, 200, headers)
    : jsonResponse({ error: 'provider_failed' }, 502, headers);
}

export async function routeUpload(request: Request, env: UploadEnv): Promise<Response> {
  const path = new URL(request.url).pathname;
  if (path !== '/images/config' && path !== '/images/upload') {
    return jsonResponse({ error: 'not_found' }, 404);
  }
  const origin = allowedOrigin(request);
  if (!origin) return jsonResponse({ error: 'origin_not_allowed' }, 403);
  const headers = corsHeaders(origin);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });

  if (path === '/images/config') {
    if (request.method !== 'GET') {
      return jsonResponse({ error: 'method_not_allowed' }, 405, { ...headers, Allow: 'GET' });
    }
    const config = configuredUploadEnv(env);
    return config
      ? jsonResponse({ siteKey: config.TURNSTILE_SITE_KEY }, 200, headers)
      : jsonResponse({ status: 'unavailable' }, 503, headers);
  }
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405, { ...headers, Allow: 'POST' });
  }
  return uploadImage(request, env, headers);
}

export function unavailableUploadResponse(request: Request): Response {
  const origin = allowedOrigin(request);
  return jsonResponse({ error: 'upload_unavailable' }, 503, origin ? corsHeaders(origin) : {});
}
