import { describe, expect, it } from 'vitest';
import { fetchLinkPhoto, isFetchableUrl } from '../helpers/link-photos';

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);

function fetcher(routes: Record<string, () => Response>) {
  const calls: string[] = [];
  const impl = (async (input: RequestInfo | URL) => {
    const url = String(input);
    calls.push(url);
    const route = routes[url];
    return route === undefined ? new Response('nope', { status: 404 }) : route();
  }) as typeof fetch;
  return { impl, calls };
}

const redirect = (to: string) => () =>
  new Response(null, { status: 302, headers: { Location: to } });

describe('fetchLinkPhoto', () => {
  it('sends a User-Agent, which some hosts require', async () => {
    const seen: (string | null)[] = [];
    const impl = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      seen.push(new Headers(init?.headers).get('User-Agent'));
      return new Response(PNG);
    }) as typeof fetch;
    await fetchLinkPhoto('https://files.example/a.png', impl);
    expect(seen[0]).toMatch(/^disalytics-admin\//);
  });

  it('downloads an image after checking its bytes', async () => {
    const { impl } = fetcher({ 'https://files.example/a.png': () => new Response(PNG) });
    expect(await fetchLinkPhoto('https://files.example/a.png', impl)).toMatchObject({
      ok: true,
      type: 'image/png',
    });
  });

  it('refuses http, bare IPs and local names without fetching', async () => {
    const { impl, calls } = fetcher({});
    for (const url of [
      'http://files.example/a.png',
      'https://127.0.0.1/a.png',
      'https://localhost/a.png',
      'https://[::1]/a.png',
    ]) {
      expect(await fetchLinkPhoto(url, impl)).toEqual({ ok: false, reason: 'not_https' });
    }
    expect(calls).toEqual([]);
    expect(isFetchableUrl(new URL('https://files.catbox.moe/x.webp'))).toBe(true);
  });

  it('follows up to three redirects and re-checks each target', async () => {
    const ok = fetcher({
      'https://a.example/1': redirect('https://a.example/2'),
      'https://a.example/2': redirect('/3'),
      'https://a.example/3': redirect('https://b.example/4'),
      'https://b.example/4': () => new Response(PNG),
    });
    expect((await fetchLinkPhoto('https://a.example/1', ok.impl)).ok).toBe(true);

    const tooMany = fetcher({
      'https://a.example/1': redirect('https://a.example/2'),
      'https://a.example/2': redirect('https://a.example/3'),
      'https://a.example/3': redirect('https://a.example/4'),
      'https://a.example/4': redirect('https://a.example/5'),
    });
    expect(await fetchLinkPhoto('https://a.example/1', tooMany.impl)).toEqual({
      ok: false,
      reason: 'too_many_redirects',
    });

    const downgrade = fetcher({ 'https://a.example/1': redirect('http://a.example/2') });
    expect(await fetchLinkPhoto('https://a.example/1', downgrade.impl)).toEqual({
      ok: false,
      reason: 'not_https',
    });
    expect(downgrade.calls).toEqual(['https://a.example/1']);
  });

  it('rejects non-images, big bodies and error statuses', async () => {
    const html = fetcher({ 'https://a.example/x': () => new Response('<html>') });
    expect(await fetchLinkPhoto('https://a.example/x', html.impl)).toEqual({
      ok: false,
      reason: 'not_an_image',
    });

    const big = fetcher({
      'https://a.example/x': () => new Response(new Uint8Array(5 * 1024 * 1024 + 1)),
    });
    expect(await fetchLinkPhoto('https://a.example/x', big.impl)).toEqual({
      ok: false,
      reason: 'too_large',
    });

    const missing = fetcher({});
    expect(await fetchLinkPhoto('https://a.example/x', missing.impl)).toEqual({
      ok: false,
      reason: 'http_404',
    });
  });

  it('gives up after the timeout', async () => {
    const slow = ((_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
      })) as typeof fetch;
    expect(await fetchLinkPhoto('https://a.example/x', slow, 20)).toEqual({
      ok: false,
      reason: 'timeout',
    });
  });
});
