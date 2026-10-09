const WEB_ORIGIN = 'https://disalytics.disa-67b.workers.dev';
const LOCAL_ORIGIN = /^http:\/\/(?:localhost|127\.0\.0\.1):\d{1,5}$/;

export function isAllowedOrigin(origin: string): boolean {
  return origin === WEB_ORIGIN || LOCAL_ORIGIN.test(origin);
}

/** Adds CORS for a GET from the web app or a local dev server; any other caller gets none. */
export function withCors(request: Request, response: Response): Response {
  const headers = new Headers(response.headers);
  headers.append('Vary', 'Origin');
  const origin = request.headers.get('Origin');
  if (origin !== null && isAllowedOrigin(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
  }
  return new Response(response.body, { status: response.status, headers });
}
