import { MAX_PHOTO_BYTES, type PhotoType, sniffImageType } from './images';

export const MAX_REDIRECTS = 3;
export const FETCH_TIMEOUT_MS = 10_000;
/** Some hosts (catbox) drop a request with no User-Agent, and a Worker's fetch sends none. */
const USER_AGENT = 'disalytics-admin/1 (+https://disalytics.disa-67b.workers.dev)';

export type LinkPhoto =
  | { readonly ok: true; readonly bytes: Uint8Array<ArrayBuffer>; readonly type: PhotoType }
  | { readonly ok: false; readonly reason: string };

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const IPV4 = /^\d{1,3}(?:\.\d{1,3}){3}$/;

/** https only, and no bare IP or local name: this is a fetch the Worker makes on a person's say-so. */
export function isFetchableUrl(url: URL): boolean {
  if (url.protocol !== 'https:') return false;
  const host = url.hostname;
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) return false;
  if (host.startsWith('[') || IPV4.test(host)) return false;
  return host.includes('.');
}

function redirectTarget(response: Response, from: URL): URL | null {
  const location = response.headers.get('Location');
  if (location === null) return null;
  try {
    return new URL(location, from);
  } catch {
    return null;
  }
}

async function readCapped(response: Response): Promise<Uint8Array<ArrayBuffer> | null> {
  const declared = Number(response.headers.get('Content-Length'));
  if (Number.isFinite(declared) && declared > MAX_PHOTO_BYTES) return null;
  if (response.body === null) return new Uint8Array(0);

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_PHOTO_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

type Hop = { readonly redirect: URL } | { readonly done: LinkPhoto };

async function fetchHop(current: URL, fetchImpl: typeof fetch, signal: AbortSignal): Promise<Hop> {
  if (!isFetchableUrl(current)) return { done: { ok: false, reason: 'not_https' } };
  const response = await fetchImpl(current, {
    redirect: 'manual',
    signal,
    headers: { Accept: 'image/webp,image/png,image/jpeg', 'User-Agent': USER_AGENT },
  });

  if (REDIRECT_STATUSES.has(response.status)) {
    await response.body?.cancel();
    const next = redirectTarget(response, current);
    return next === null ? { done: { ok: false, reason: 'bad_redirect' } } : { redirect: next };
  }
  if (!response.ok) {
    await response.body?.cancel();
    return { done: { ok: false, reason: `http_${response.status}` } };
  }
  const bytes = await readCapped(response);
  if (bytes === null) return { done: { ok: false, reason: 'too_large' } };
  const type = sniffImageType(bytes);
  return {
    done: type === null ? { ok: false, reason: 'not_an_image' } : { ok: true, bytes, type },
  };
}

/**
 * Downloads one photo link. At most {@link MAX_REDIRECTS} redirects, each target checked the same way
 * as the first URL, one 10 s budget for the whole chain, 5 MB streamed, and the bytes must open with
 * a webp, png or jpeg signature whatever the server called them.
 */
export async function fetchLinkPhoto(
  link: string,
  fetchImpl: typeof fetch = fetch,
  timeoutMs: number = FETCH_TIMEOUT_MS,
): Promise<LinkPhoto> {
  let current: URL;
  try {
    current = new URL(link);
  } catch {
    return { ok: false, reason: 'invalid_url' };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
      const step = await fetchHop(current, fetchImpl, controller.signal);
      if ('done' in step) return step.done;
      current = step.redirect;
    }
    return { ok: false, reason: 'too_many_redirects' };
  } catch {
    return { ok: false, reason: controller.signal.aborted ? 'timeout' : 'network' };
  } finally {
    clearTimeout(timer);
  }
}
