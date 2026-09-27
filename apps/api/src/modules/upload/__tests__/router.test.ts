import { afterEach, describe, expect, it, vi } from 'vitest';
import { MAX_BODY_BYTES } from '../constants';
import { routeUpload } from '../router';

describe('lineup photo upload', () => {
  afterEach(() => vi.unstubAllGlobals());

  const origin = 'https://disalytics.disa-67b.workers.dev';
  const env = {
    CATBOX_USERHASH: 'private-hash',
    TURNSTILE_SECRET: 'private-secret',
    TURNSTILE_SITE_KEY: 'public-site-key',
    UPLOAD_RATE_LIMITER: { limit: async () => ({ success: true }) },
  };
  const webp = new TextEncoder().encode('RIFF0000WEBPdata');

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

  it('returns only the public sitekey to the allowed origin', async () => {
    const response = await routeUpload(
      new Request('https://api.example/images/config', { headers: { Origin: origin } }),
      env,
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(origin);
    expect(await response.json()).toEqual({ siteKey: 'public-site-key' });
  });

  it('refuses requests from another origin', async () => {
    const response = await routeUpload(
      new Request('https://api.example/images/config', {
        headers: { Origin: 'https://evil.example' },
      }),
      env,
    );
    expect(response.status).toBe(403);
  });

  it('rejects an invalid image before contacting either provider', async () => {
    const upstream = vi.fn();
    vi.stubGlobal('fetch', upstream);
    const response = await routeUpload(imageRequest(new TextEncoder().encode('not webp')), env);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'invalid_image' });
    expect(upstream).not.toHaveBeenCalled();
  });

  it('requires a valid one-use challenge before Catbox upload', async () => {
    const upstream = vi.fn(async () => Response.json({ success: false }));
    vi.stubGlobal('fetch', upstream);
    const response = await routeUpload(imageRequest(webp), env);
    expect(response.status).toBe(403);
    expect(upstream).toHaveBeenCalledTimes(1);
  });

  it('rate limits before reading or forwarding a photo', async () => {
    const upstream = vi.fn();
    vi.stubGlobal('fetch', upstream);
    const response = await routeUpload(imageRequest(webp), {
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
    request.headers.set('Content-Length', String(MAX_BODY_BYTES + 1));
    const response = await routeUpload(request, env);
    expect(response.status).toBe(413);
    expect(upstream).not.toHaveBeenCalled();
  });

  it('uploads a verified image under the owner hash and returns only its URL', async () => {
    const upstream = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes('siteverify')) {
        return Response.json({ success: true, hostname: 'disalytics.disa-67b.workers.dev' });
      }
      expect(init?.body).toBeInstanceOf(FormData);
      expect(init?.redirect).toBe('error');
      const body = init?.body;
      if (!(body instanceof FormData)) throw new Error('missing form');
      expect(body.get('userhash')).toBe('private-hash');
      expect(body.get('reqtype')).toBe('fileupload');
      return new Response('https://files.catbox.moe/abcdef.webp');
    });
    vi.stubGlobal('fetch', upstream);
    const response = await routeUpload(imageRequest(webp), env);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ url: 'https://files.catbox.moe/abcdef.webp' });
    expect(upstream).toHaveBeenCalledTimes(2);
  });

  it('refuses a provider response that is not a Catbox image URL', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) =>
        String(input).includes('siteverify')
          ? Response.json({ success: true, hostname: 'disalytics.disa-67b.workers.dev' })
          : new Response('https://evil.example/abcdef.webp'),
      ),
    );
    const response = await routeUpload(imageRequest(webp), env);
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: 'provider_failed' });
  });
});
