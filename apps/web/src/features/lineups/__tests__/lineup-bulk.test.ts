import type { Lineup } from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import { bulkOf } from '../helpers/lineup-bulk';
import { lineupTargets } from '../helpers/lineup-targets';

const lineup = (id: string, patch: Partial<Lineup> = {}): Lineup => ({
  id,
  title: id,
  map: 'de_mirage',
  side: 'T',
  kind: 'smoke',
  origin: { x: 0, y: 0, z: 0 },
  landing: { x: -2500, y: -2500, z: 0 },
  pitch: 0,
  yaw: 0,
  throwType: 'stand',
  movementKeys: [],
  movementKeysSummary: '',
  command: '',
  createdAt: Number(id.slice(1)),
  ...patch,
});

const far = { x: 3000, y: 3000, z: 0 };

describe('bulkOf', () => {
  it('can merge two targets by landing, and by throw spot only when each has one position', () => {
    const single = bulkOf(
      lineupTargets('de_mirage', [lineup('a1'), lineup('a2', { landing: far })]),
    );
    const several = bulkOf(
      lineupTargets('de_mirage', [lineup('a1'), lineup('a2'), lineup('a3', { landing: far })]),
    );

    expect([single.canMergeLandings, single.canMergeOrigins]).toEqual([true, true]);
    expect([several.canMergeLandings, several.canMergeOrigins]).toEqual([true, false]);
    expect(bulkOf(lineupTargets('de_mirage', [lineup('a1')])).canMergeLandings).toBe(false);
  });

  it('offers to separate only what is grouped, and to delete only what is the user own', () => {
    const bulk = bulkOf(
      lineupTargets('de_mirage', [
        lineup('a1', { isBuiltIn: true }),
        lineup('a2', { landing: far, groupId: 'g', groupTarget: 'origin' }),
      ]),
    );

    expect(bulk.canUngroup).toBe(true);
    expect(bulk.deletable.map(({ id }) => id)).toEqual(['a2']);
    expect(bulkOf([]).canUngroup).toBe(false);
  });
});
