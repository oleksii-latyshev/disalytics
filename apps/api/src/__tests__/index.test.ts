import { afterEach, describe, expect, it, vi } from 'vitest';
import worker from '../index';

describe('API worker', () => {
  afterEach(() => vi.unstubAllGlobals());

  const origin = 'https://disalytics.disa-67b.workers.dev';
  const env = {
    CATBOX_USERHASH: 'private-hash',
    TURNSTILE_SECRET: 'private-secret',
    TURNSTILE_SITE_KEY: 'public-site-key',
    UPLOAD_RATE_LIMITER: { limit: async () => ({ success: true }) },
  };

  function imageRequest(bytes: Uint8Array, token = 'fresh-token'): Request {
    const form = new FormData();
    const buffer = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(buffer).set(bytes);
    form.set('image', new File([buffer], 'lineup.webp', { type: 'image/webp' }));
    form.set('turnstile', token);
    return new Request('https://api.example/images/upload', {
      method: 'POST',
      headers: { Origin: origin },
      body: form,
    });
  }

  const webp = new TextEncoder().encode('RIFF0000WEBPdata');

  it('returns an uncached health response for GET /health', async () => {
    const response = await worker.fetch(new Request('https://api.example/health'));

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/json');
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(await response.json()).toEqual({ status: 'ok' });
  });

  it('rejects methods other than GET on /health', async () => {
    const response = await worker.fetch(
      new Request('https://api.example/health', { method: 'POST' }),
    );

    expect(response.status).toBe(405);
    expect(response.headers.get('Allow')).toBe('GET');
    expect(response.headers.get('Content-Type')).toBe('application/json');
    expect(await response.json()).toEqual({ error: 'method_not_allowed' });
  });

  it('returns a stable not-found error for unknown paths', async () => {
    const response = await worker.fetch(new Request('https://api.example/other'));

    expect(response.status).toBe(404);
    expect(response.headers.get('Content-Type')).toBe('application/json');
    expect(await response.json()).toEqual({ error: 'not_found' });
  });

  it('keeps the owner hash private and refuses other origins', async () => {
    const config = await worker.fetch(
      new Request('https://api.example/images/config', {
        headers: { Origin: origin },
      }),
      env,
    );
    expect(await config.json()).toEqual({ siteKey: 'public-site-key' });
    expect(config.headers.get('Access-Control-Allow-Origin')).toBe(origin);
    const denied = await worker.fetch(
      new Request('https://api.example/images/config', {
        headers: { Origin: 'https://evil.example' },
      }),
      env,
    );
    expect(denied.status).toBe(403);
  });

  it('rejects an invalid image before calling Turnstile or Catbox', async () => {
    const upstream = vi.fn();
    vi.stubGlobal('fetch', upstream);
    const response = await worker.fetch(imageRequest(new TextEncoder().encode('not webp')), env);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'invalid_image' });
    expect(upstream).not.toHaveBeenCalled();
  });

  it('requires a valid one-use challenge before Catbox upload', async () => {
    const upstream = vi.fn(async () => Response.json({ success: false }));
    vi.stubGlobal('fetch', upstream);
    const response = await worker.fetch(imageRequest(webp), env);
    expect(response.status).toBe(403);
    expect(upstream).toHaveBeenCalledTimes(1);
  });

  it('rate limits before reading or forwarding a photo', async () => {
    const upstream = vi.fn();
    vi.stubGlobal('fetch', upstream);
    const response = await worker.fetch(imageRequest(webp), {
      ...env,
      UPLOAD_RATE_LIMITER: { limit: async () => ({ success: false }) },
    });
    expect(response.status).toBe(429);
    expect(upstream).not.toHaveBeenCalled();
  });

  it('rejects an oversized request before contacting the provider', async () => {
    const upstream = vi.fn();
    vi.stubGlobal('fetch', upstream);
    const request = imageRequest(webp);
    request.headers.set('Content-Length', String(2 * 1024 * 1024 + 16 * 1024 + 1));
    const response = await worker.fetch(request, env);
    expect(response.status).toBe(413);
    expect(upstream).not.toHaveBeenCalled();
  });

  it('uploads a verified image under the owner hash and returns only its URL', async () => {
    const upstream = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes('siteverify')) {
        return Response.json({ success: true, hostname: 'disalytics.disa-67b.workers.dev' });
      }
      expect(init?.body).toBeInstanceOf(FormData);
      const body = init?.body;
      if (!(body instanceof FormData)) throw new Error('missing form');
      expect(body.get('userhash')).toBe('private-hash');
      expect(body.get('reqtype')).toBe('fileupload');
      return new Response('https://files.catbox.moe/abcdef.webp');
    });
    vi.stubGlobal('fetch', upstream);
    const response = await worker.fetch(imageRequest(webp), env);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ url: 'https://files.catbox.moe/abcdef.webp' });
    expect(upstream).toHaveBeenCalledTimes(2);
  });

  it('refuses a successful provider response that is not a Catbox image URL', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) =>
        String(input).includes('siteverify')
          ? Response.json({ success: true, hostname: 'disalytics.disa-67b.workers.dev' })
          : new Response('https://evil.example/abcdef.webp'),
      ),
    );
    const response = await worker.fetch(imageRequest(webp), env);
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: 'provider_failed' });
  });
});
