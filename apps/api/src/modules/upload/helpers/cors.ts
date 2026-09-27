import { SITE_HOST } from '../constants';

export function allowedOrigin(request: Request): string | null {
  const origin = request.headers.get('Origin');
  if (origin === `https://${SITE_HOST}`) return origin;
  if (origin === 'http://localhost:5173' || origin === 'http://127.0.0.1:5173') return origin;
  return null;
}

export function corsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  };
}
