import type { Lineup } from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import { combineLineups } from '../helpers/lineup-catalog';

const bundled: Lineup = {
  id: 'mirage-smoke-1',
  title: 'Bundled smoke',
  map: 'de_mirage',
  side: 'T',
  kind: 'smoke',
  origin: { x: 10, y: 20, z: 0 },
  landing: { x: 30, y: 40, z: 0 },
  pitch: 0,
  yaw: 0,
  throwType: 'stand',
  movementKeys: [],
  movementKeysSummary: '',
  command: '',
  createdAt: 1,
  isBuiltIn: true,
};

describe('combineLineups', () => {
  it('shows a saved edit once and uses its changed coordinates', () => {
    const edited: Lineup = {
      ...bundled,
      origin: { x: 50, y: 60, z: 0 },
      isBuiltIn: false,
    };
    const other: Lineup = { ...bundled, id: 'mirage-flash-2', kind: 'flash' };

    expect(combineLineups([edited], [bundled, other])).toEqual([edited, other]);
  });
});
