const API_URL = import.meta.env.DEV
  ? 'http://localhost:8787'
  : 'https://disalytics-api.disa-67b.workers.dev';

export interface TurnstileApi {
  render(
    container: HTMLElement,
    options: {
      sitekey: string;
      callback(token: string): void;
      'expired-callback'(): void;
      'error-callback'(): void;
    },
  ): string;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export async function uploadSiteKey(): Promise<string | null> {
  try {
    const response = await fetch(`${API_URL}/images/config`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) return null;
    const result: unknown = await response.json();
    if (
      typeof result === 'object' &&
      result !== null &&
      'siteKey' in result &&
      typeof result.siteKey === 'string' &&
      result.siteKey.length > 0
    ) {
      return result.siteKey;
    }
  } catch {
    return null;
  }
  return null;
}

export async function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return window.turnstile;
  let script = document.querySelector<HTMLScriptElement>('script[data-lineup-turnstile]');
  if (!script) {
    script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.dataset.lineupTurnstile = '';
    document.head.append(script);
  }
  await new Promise<void>((resolve, reject) => {
    if (window.turnstile) {
      resolve();
      return;
    }
    script.addEventListener('load', () => resolve(), { once: true });
    script.addEventListener('error', () => reject(new Error('Turnstile unavailable')), {
      once: true,
    });
  });
  if (!window.turnstile) throw new Error('Turnstile unavailable');
  return window.turnstile;
}

export async function uploadLineupImage(file: File, token: string): Promise<string> {
  const body = new FormData();
  body.set('image', file);
  body.set('turnstile', token);
  const response = await fetch(`${API_URL}/images/upload`, {
    method: 'POST',
    body,
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error('Upload failed');
  const result: unknown = await response.json();
  if (
    typeof result !== 'object' ||
    result === null ||
    !('url' in result) ||
    typeof result.url !== 'string'
  )
    throw new Error('Invalid upload response');
  const url = new URL(result.url);
  if (url.protocol !== 'https:' || url.hostname !== 'files.catbox.moe') {
    throw new Error('Invalid upload URL');
  }
  return url.href;
}
