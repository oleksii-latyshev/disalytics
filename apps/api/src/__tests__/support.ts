import type { Lineup } from '@disa/demo-core';
import type { Env } from '../app';
import type { KvBinding } from '../modules/photos';
import type { CacheBinding } from '../shared/http/middleware';
import { sqliteD1 } from './sqlite-d1';

export const lineup: Lineup = {
  id: 'mirage-1',
  title: 'Smoke window',
  map: 'de_mirage',
  side: 'T',
  kind: 'smoke',
  origin: { x: 1, y: 2, z: 0 },
  landing: { x: 3, y: 4, z: 0 },
  pitch: 0,
  yaw: 0,
  throwType: 'stand',
  movementKeys: [],
  movementKeysSummary: '',
  command: '',
  createdAt: 1,
};

export interface FakeKv extends KvBinding {
  readonly entries: Map<string, { bytes: ArrayBuffer; contentType?: string }>;
}

export function fakeKv(): FakeKv {
  const entries: FakeKv['entries'] = new Map();
  return {
    entries,
    async getWithMetadata(key) {
      const entry = entries.get(key);
      return {
        value: entry?.bytes ?? null,
        metadata: entry?.contentType === undefined ? null : { contentType: entry.contentType },
      };
    },
    async put(key, value, options) {
      const contentType = options?.metadata?.contentType;
      entries.set(
        key,
        contentType === undefined ? { bytes: value } : { bytes: value, contentType },
      );
    },
  };
}

export interface FakeCache extends CacheBinding {
  readonly entries: Map<string, Response>;
}

export function fakeCache(): FakeCache {
  const entries = new Map<string, Response>();
  return {
    entries,
    async match(request) {
      return entries.get(request.url)?.clone();
    },
    async put(request, response) {
      entries.set(request.url, response);
    },
  };
}

export function testEnv(): Env & { readonly LINEUP_PHOTOS: FakeKv } {
  return { LINEUPS_DB: sqliteD1(), LINEUP_PHOTOS: fakeKv() };
}
