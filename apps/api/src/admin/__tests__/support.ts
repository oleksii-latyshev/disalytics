import type { Lineup } from '@disa/demo-core';
import { Effect } from 'effect';
import { sqliteD1 } from '../../__tests__/sqlite-d1';
import { fakeKv } from '../../__tests__/support';
import { makeLineupStorage } from '../../modules/lineups';
import { configOf, handleApi } from '../app';
import type { AdminConfigShape } from '../config';
import type { AdminEnv } from '../env';

export const baseLineup: Lineup = {
  id: 'mirage-1',
  title: 'Smoke window',
  map: 'de_mirage',
  side: 'T',
  kind: 'smoke',
  origin: { x: 100, y: 200, z: 0 },
  landing: { x: 300, y: 400, z: 0 },
  pitch: -10,
  yaw: 45,
  throwType: 'stand',
  movementKeys: [],
  movementKeysSummary: '',
  command: '',
  createdAt: 1,
};

export function lineup(overrides: Partial<Lineup> = {}): Lineup {
  return { ...baseLineup, ...overrides };
}

export const PHOTO_BASE = 'https://api.example/photos';

export function adminEnv(overrides: Partial<Omit<AdminEnv, 'LINEUP_PHOTOS'>> = {}): AdminEnv & {
  readonly LINEUP_PHOTOS: ReturnType<typeof fakeKv>;
} {
  return {
    LINEUPS_DB: sqliteD1(),
    LINEUP_PHOTOS: fakeKv(),
    ASSETS: { fetch: async () => new Response('asset') },
    TEAM_DOMAIN: '',
    POLICY_AUD: '',
    PHOTO_BASE_URL: PHOTO_BASE,
    ALLOW_DEV_IDENTITY: 'dev@localhost',
    ...overrides,
  };
}

/** An env whose database already holds `stored`, saved as the seed would have. */
export async function seededEnv(
  stored: readonly Lineup[],
  overrides: Partial<Omit<AdminEnv, 'LINEUP_PHOTOS'>> = {},
) {
  const env = adminEnv(overrides);
  if (stored.length > 0) {
    await Effect.runPromise(
      makeLineupStorage(env.LINEUPS_DB).saveLineups({ lineups: stored, actor: 'seed', now: 1 }),
    );
  }
  return env;
}

/** A 1x1 PNG, base64. */
export const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
export const PNG_DATA_URL = `data:image/png;base64,${PNG_BASE64}`;

export const NOW = 1_800_000_000_000;

export function api(
  env: AdminEnv,
  path: string,
  init: { method?: string; body?: unknown; host?: string; headers?: Record<string, string> } = {},
  config: Partial<AdminConfigShape> = {},
): Promise<Response> {
  const {
    method = init.body === undefined ? 'GET' : 'POST',
    body,
    host = 'localhost',
    headers,
  } = init;
  const request = new Request(`http://${host}${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return handleApi(request, env, { ...configOf(env, () => NOW), ...config });
}

export function file(lineups: unknown[], images: Record<string, string> = {}) {
  return {
    version: 2,
    generator: 'disalytics',
    exportedAt: '2026-01-01T00:00:00Z',
    lineups,
    images,
  };
}
