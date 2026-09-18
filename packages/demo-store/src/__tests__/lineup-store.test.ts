import 'fake-indexeddb/auto';
import type { Lineup } from '@disa/demo-core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { type LineupStore, openLineupStore } from '../lineup-store';

const lineupA: Lineup = {
  id: 'dust2-mid-smoke',
  title: 'Mid Doors Smoke',
  map: 'de_dust2',
  side: 'T',
  kind: 'smoke',
  origin: { x: 100, y: 200, z: 0 },
  landing: { x: 500, y: 600, z: 0 },
  pitch: -10,
  yaw: 45,
  throwType: 'stand',
  movementKeys: ['Stand'],
  movementKeysSummary: 'Stand',
  command: 'setpos 100.00 200.00 0.00; setang -10.00 45.00 0 // Stand',
  createdAt: 1000,
};

const lineupB: Lineup = {
  id: 'dust2-a-flash',
  title: 'A Long Flash',
  map: 'de_dust2',
  side: 'CT',
  kind: 'flash',
  origin: { x: -200, y: 300, z: 10 },
  landing: { x: -100, y: 800, z: 50 },
  pitch: -35,
  yaw: 120,
  throwType: 'jump',
  movementKeys: ['Jump'],
  movementKeysSummary: 'Jump',
  command: 'setpos -200.00 300.00 10.00; setang -35.00 120.00 0 // Jump',
  createdAt: 2000,
};

const lineupC: Lineup = {
  id: 'mirage-window-smoke',
  title: 'Window Smoke from T Spawn',
  map: 'de_mirage',
  side: 'T',
  kind: 'smoke',
  origin: { x: 1200, y: -400, z: -100 },
  landing: { x: -500, y: -100, z: 0 },
  pitch: -20,
  yaw: -90,
  throwType: 'run',
  movementKeys: ['W', 'Jump'],
  movementKeysSummary: 'W + Jump',
  command: 'setpos 1200.00 -400.00 -100.00; setang -20.00 -90.00 0 // W + Jump',
  createdAt: 3000,
};

const lineupBoth: Lineup = {
  id: 'dust2-retake-smoke',
  title: 'B Site Retake Smoke',
  map: 'de_dust2',
  side: 'BOTH',
  kind: 'smoke',
  origin: { x: 300, y: 400, z: 20 },
  landing: { x: 700, y: 900, z: 0 },
  pitch: -15,
  yaw: 180,
  throwType: 'stand',
  movementKeys: ['Stand'],
  movementKeysSummary: 'Stand',
  command: 'setpos 300.00 400.00 20.00; setang -15.00 180.00 0 // Stand',
  createdAt: 4000,
};

describe('LineupStore (IndexedDB)', () => {
  let store: LineupStore;

  beforeEach(async () => {
    const opened = await openLineupStore();
    if (opened === null) throw new Error('Expected lineup store to open');
    store = opened;
    await store.clear();
  });

  afterEach(async () => {
    await store.clear();
    store.close();
  });

  it('puts and gets a lineup by id', async () => {
    await store.put(lineupA);
    const retrieved = await store.get('dust2-mid-smoke');

    expect(retrieved).toEqual(lineupA);
  });

  it('returns null when lineup does not exist', async () => {
    const missing = await store.get('non-existent');
    expect(missing).toBeNull();
  });

  it('saves multiple lineups with putMany and lists all', async () => {
    await store.putMany([lineupA, lineupB, lineupC]);
    const list = await store.list();

    expect(list).toHaveLength(3);
    const ids = list.map((l) => l.id);
    expect(ids).toContain('dust2-mid-smoke');
    expect(ids).toContain('dust2-a-flash');
    expect(ids).toContain('mirage-window-smoke');
  });

  it('filters by map', async () => {
    await store.putMany([lineupA, lineupB, lineupC]);

    const dust2 = await store.list({ map: 'de_dust2' });
    expect(dust2).toHaveLength(2);
    expect(dust2.every((l) => l.map === 'de_dust2')).toBe(true);

    const mirage = await store.list({ map: 'de_mirage' });
    expect(mirage).toHaveLength(1);
    expect(mirage[0]?.id).toBe('mirage-window-smoke');
  });

  it('filters by kind and side (including BOTH)', async () => {
    await store.putMany([lineupA, lineupB, lineupBoth]);

    // Dust2 smokes for T: should match lineupA (T) and lineupBoth (BOTH)
    const tSmokes = await store.list({ map: 'de_dust2', kind: 'smoke', side: 'T' });
    expect(tSmokes).toHaveLength(2);
    expect(tSmokes.map((l) => l.id)).toEqual(
      expect.arrayContaining(['dust2-mid-smoke', 'dust2-retake-smoke']),
    );

    // Dust2 smokes for CT: should match lineupBoth (BOTH)
    const ctSmokes = await store.list({ map: 'de_dust2', kind: 'smoke', side: 'CT' });
    expect(ctSmokes).toHaveLength(1);
    expect(ctSmokes[0]?.id).toBe('dust2-retake-smoke');

    // Dust2 flashes
    const flashes = await store.list({ map: 'de_dust2', kind: 'flash' });
    expect(flashes).toHaveLength(1);
    expect(flashes[0]?.id).toBe('dust2-a-flash');
  });

  it('deletes a lineup by id', async () => {
    await store.put(lineupA);
    expect(await store.get('dust2-mid-smoke')).not.toBeNull();

    await store.delete('dust2-mid-smoke');
    expect(await store.get('dust2-mid-smoke')).toBeNull();
  });

  it('clears all lineups', async () => {
    await store.putMany([lineupA, lineupB]);
    expect(await store.list()).toHaveLength(2);

    await store.clear();
    expect(await store.list()).toHaveLength(0);
  });
});
