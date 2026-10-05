import { describe, expect, it } from 'vitest';
import { precacheResponseMimePlugin } from '../helpers/precache-response';

const request = (url: string): Request => new Request(`https://example.test${url}`);
const response = (contentType?: string): Response =>
  new Response(null, { headers: contentType ? { 'content-type': contentType } : {} });

describe('precache response MIME validation', () => {
  it('rejects HTML returned for a JavaScript asset during install', async () => {
    await expect(
      precacheResponseMimePlugin.fetchDidSucceed({
        request: request('/assets/player-a1b2.js'),
        response: response('text/html'),
      }),
    ).rejects.toThrow('Unexpected precache MIME type');
  });

  it('rejects a JavaScript response with no MIME type', async () => {
    await expect(
      precacheResponseMimePlugin.fetchDidSucceed({
        request: request('/assets/player.js'),
        response: response(),
      }),
    ).rejects.toThrow('Unexpected precache MIME type');
  });

  it('keeps the same response for JavaScript MIME types with parameters and query strings', async () => {
    const validResponse = response('Application/JavaScript; charset=utf-8');

    await expect(
      precacheResponseMimePlugin.fetchDidSucceed({
        request: request('/assets/player.js?v=123'),
        response: validResponse,
      }),
    ).resolves.toBe(validResponse);
  });

  it('keeps the same response for CSS and requires text/css', async () => {
    const validResponse = response('text/css; charset=UTF-8');

    await expect(
      precacheResponseMimePlugin.fetchDidSucceed({
        request: request('/assets/app.css?hash=1'),
        response: validResponse,
      }),
    ).resolves.toBe(validResponse);
    await expect(
      precacheResponseMimePlugin.fetchDidSucceed({
        request: request('/assets/app.css'),
        response: response('application/octet-stream'),
      }),
    ).rejects.toThrow('Unexpected precache MIME type');
  });

  it('rejects a poisoned cached asset so Workbox can refetch it', async () => {
    const poisonedResponse = response('text/html');

    await expect(
      precacheResponseMimePlugin.cachedResponseWillBeUsed({
        request: request('/assets/app.css'),
        cachedResponse: poisonedResponse,
      }),
    ).resolves.toBeUndefined();
    await expect(
      precacheResponseMimePlugin.cachedResponseWillBeUsed({
        request: request('/assets/app.js'),
        cachedResponse: poisonedResponse,
      }),
    ).resolves.toBeUndefined();
    await expect(
      precacheResponseMimePlugin.cachedResponseWillBeUsed({
        request: request('/assets/app.js'),
        cachedResponse: undefined,
      }),
    ).resolves.toBeUndefined();
  });

  it('reuses valid cached assets offline and leaves other paths unchanged', async () => {
    const javascript = response('text/x-javascript');
    const stylesheet = response('text/css');
    const html = response('text/html');

    await expect(
      precacheResponseMimePlugin.cachedResponseWillBeUsed({
        request: request('/assets/app.js'),
        cachedResponse: javascript,
      }),
    ).resolves.toBe(javascript);
    await expect(
      precacheResponseMimePlugin.cachedResponseWillBeUsed({
        request: request('/assets/app.css'),
        cachedResponse: stylesheet,
      }),
    ).resolves.toBe(stylesheet);
    await expect(
      precacheResponseMimePlugin.cachedResponseWillBeUsed({
        request: request('/index.html'),
        cachedResponse: html,
      }),
    ).resolves.toBe(html);
    await expect(
      precacheResponseMimePlugin.fetchDidSucceed({
        request: request('/manifest.webmanifest'),
        response: html,
      }),
    ).resolves.toBe(html);
  });
});
