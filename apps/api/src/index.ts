import { Effect } from 'effect';

const CATBOX_API = 'https://catbox.moe/user/api.php';
const VERIFY_API = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const SITE_HOST = 'disalytics.disa-67b.workers.dev';
const MAX_IMAGE = 2 * 1024 * 1024;
const MAX_BODY = MAX_IMAGE + 16 * 1024;

interface Env {
  CATBOX_USERHASH?: string;
  TURNSTILE_SECRET?: string;
  TURNSTILE_SITE_KEY?: string;
  UPLOAD_RATE_LIMITER?: {
    limit(options: { key: string }): Promise<{ success: boolean }>;
  };
}

function json(
  body: Record<string, string>,
  status: number,
  headers: Record<string, string> = {},
): Response {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
}

function originOf(request: Request): string | null {
  const origin = request.headers.get('Origin');
  if (origin === `https://${SITE_HOST}`) return origin;
  if (origin === 'http://localhost:5173' || origin === 'http://127.0.0.1:5173') return origin;
  return null;
}

function cors(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  };
}

async function bodyWithinLimit(request: Request): Promise<Uint8Array<ArrayBuffer> | null> {
  const reader = request.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    size += part.value.byteLength;
    if (size > MAX_BODY) {
      await reader.cancel();
      return null;
    }
    chunks.push(part.value);
  }
  const bytes = new Uint8Array(new ArrayBuffer(size));
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

async function validWebp(file: File): Promise<boolean> {
  if (file.type !== 'image/webp' || file.size === 0 || file.size > MAX_IMAGE) return false;
  const header = new TextDecoder().decode(await file.slice(0, 12).arrayBuffer());
  return header.startsWith('RIFF') && header.slice(8, 12) === 'WEBP';
}

async function verified(token: string, secret: string): Promise<boolean> {
  try {
    const response = await fetch(VERIFY_API, {
      method: 'POST',
      body: new URLSearchParams({ secret, response: token }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return false;
    const result: unknown = await response.json();
    return (
      typeof result === 'object' &&
      result !== null &&
      'success' in result &&
      result.success === true &&
      'hostname' in result &&
      (result.hostname === SITE_HOST ||
        result.hostname === 'localhost' ||
        result.hostname === '127.0.0.1')
    );
  } catch {
    return false;
  }
}

async function validChallenge(value: FormDataEntryValue | null, secret: string): Promise<boolean> {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= 2048 &&
    (await verified(value, secret))
  );
}

function catboxImageUrl(raw: string): string | null {
  const url = new URL(raw.trim());
  if (
    url.protocol !== 'https:' ||
    url.hostname !== 'files.catbox.moe' ||
    !/^\/[a-zA-Z0-9]{6,12}\.webp$/.test(url.pathname) ||
    url.search ||
    url.hash
  ) {
    return null;
  }
  return url.href;
}

function expectedUploadFields(form: FormData): boolean {
  let unexpectedField = false;
  form.forEach((_value, key) => {
    if (key !== 'image' && key !== 'turnstile') unexpectedField = true;
  });
  return (
    !unexpectedField && form.getAll('image').length === 1 && form.getAll('turnstile').length === 1
  );
}

async function upload(
  request: Request,
  env: Env,
  headers: Record<string, string>,
): Promise<Response> {
  if (
    !env.CATBOX_USERHASH ||
    !env.TURNSTILE_SECRET ||
    !env.TURNSTILE_SITE_KEY ||
    !env.UPLOAD_RATE_LIMITER
  ) {
    return json({ error: 'upload_unavailable' }, 503, headers);
  }
  const contentType = request.headers.get('Content-Type');
  if (!contentType?.startsWith('multipart/form-data;'))
    return json({ error: 'invalid_request' }, 415, headers);
  if (Number(request.headers.get('Content-Length')) > MAX_BODY)
    return json({ error: 'image_too_large' }, 413, headers);

  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  const allowance = await env.UPLOAD_RATE_LIMITER.limit({ key: ip });
  if (!allowance.success) return json({ error: 'rate_limited' }, 429, headers);

  const bytes = await bodyWithinLimit(request);
  if (!bytes) return json({ error: 'image_too_large' }, 413, headers);
  let form: FormData;
  try {
    form = await new Request(request.url, {
      method: 'POST',
      headers: { 'Content-Type': contentType },
      body: bytes,
    }).formData();
  } catch {
    return json({ error: 'invalid_request' }, 400, headers);
  }
  if (!expectedUploadFields(form)) {
    return json({ error: 'invalid_request' }, 400, headers);
  }
  const file = form.get('image');
  const token = form.get('turnstile');
  if (!(file instanceof File) || !(await validWebp(file)))
    return json({ error: 'invalid_image' }, 400, headers);
  if (!(await validChallenge(token, env.TURNSTILE_SECRET))) {
    return json({ error: 'verification_failed' }, 403, headers);
  }

  const data = new FormData();
  data.set('reqtype', 'fileupload');
  data.set('userhash', env.CATBOX_USERHASH);
  data.set('fileToUpload', file, 'lineup.webp');
  try {
    const response = await fetch(CATBOX_API, {
      method: 'POST',
      body: data,
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) return json({ error: 'provider_failed' }, 502, headers);
    const url = catboxImageUrl(await response.text());
    return url ? json({ url }, 200, headers) : json({ error: 'provider_failed' }, 502, headers);
  } catch {
    return json({ error: 'provider_failed' }, 502, headers);
  }
}

async function route(request: Request, env: Env): Promise<Response> {
  const path = new URL(request.url).pathname;
  if (path === '/health') {
    if (request.method !== 'GET')
      return json({ error: 'method_not_allowed' }, 405, { Allow: 'GET' });
    return json({ status: 'ok' }, 200);
  }
  if (path !== '/images/config' && path !== '/images/upload')
    return json({ error: 'not_found' }, 404);
  const origin = originOf(request);
  if (!origin) return json({ error: 'origin_not_allowed' }, 403);
  const headers = cors(origin);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (path === '/images/config') {
    if (request.method !== 'GET')
      return json({ error: 'method_not_allowed' }, 405, { ...headers, Allow: 'GET' });
    const ready = Boolean(
      env.CATBOX_USERHASH &&
        env.TURNSTILE_SECRET &&
        env.TURNSTILE_SITE_KEY &&
        env.UPLOAD_RATE_LIMITER,
    );
    return ready
      ? json({ siteKey: env.TURNSTILE_SITE_KEY ?? '' }, 200, headers)
      : json({ status: 'unavailable' }, 503, headers);
  }
  if (request.method !== 'POST')
    return json({ error: 'method_not_allowed' }, 405, { ...headers, Allow: 'POST' });
  return upload(request, env, headers);
}

export default {
  async fetch(request: Request, env: Env = {}): Promise<Response> {
    try {
      return await Effect.runPromise(Effect.tryPromise(() => route(request, env)));
    } catch {
      const origin = originOf(request);
      return json({ error: 'upload_unavailable' }, 503, origin ? cors(origin) : {});
    }
  },
};
