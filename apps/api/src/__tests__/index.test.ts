import { describe, expect, it } from 'vitest';
import worker from '../index';

describe('API worker dispatch', () => {
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
    expect(await response.json()).toEqual({ error: 'method_not_allowed' });
  });

  it('returns a stable not-found error for unknown paths', async () => {
    const response = await worker.fetch(new Request('https://api.example/other'));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'not_found' });
  });
});
