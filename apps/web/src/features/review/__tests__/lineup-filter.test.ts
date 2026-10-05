import type { LineupTarget } from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import { countByKind, filterTargets, NO_FILTER, targetsInScope } from '../helpers/lineup-filter';
import type { TargetNames } from '../helpers/lineup-names';

function target(id: string, kind: LineupTarget['kind'], side: LineupTarget['side']): LineupTarget {
  return {
    id,
    kind,
    side,
    landing: { x: 0, y: 0, z: 0 },
    variants: [],
    throwCount: 1,
  };
}

const targets = [
  target('xbox-smoke', 'smoke', 'T'),
  target('xbox-flash', 'flash', 'BOTH'),
  target('long-smoke', 'smoke', 'CT'),
];

const names = new Map<string, TargetNames>([
  ['xbox-smoke', { target: null, origins: new Map(), searchText: 'xbox smoke b doors' }],
  ['xbox-flash', { target: null, origins: new Map(), searchText: 'xbox flash' }],
  ['long-smoke', { target: null, origins: new Map(), searchText: 'a long smoke' }],
]);

describe('filterTargets', () => {
  it('keeps everything when nothing is asked for', () => {
    expect(filterTargets(targets, names, NO_FILTER)).toHaveLength(3);
  });

  it('keeps a side and what both sides threw', () => {
    const ids = filterTargets(targets, names, { ...NO_FILTER, side: 'T' }).map(({ id }) => id);

    expect(ids).toEqual(['xbox-smoke', 'xbox-flash']);
  });

  it('searches the names it was given, ignoring case and padding', () => {
    const found = filterTargets(targets, names, { ...NO_FILTER, query: '  XBOX ' });

    expect(found.map(({ id }) => id)).toEqual(['xbox-smoke', 'xbox-flash']);
  });

  it('narrows to a kind', () => {
    const found = filterTargets(targets, names, { ...NO_FILTER, kind: 'flash' });

    expect(found.map(({ id }) => id)).toEqual(['xbox-flash']);
  });
});

describe('targetsInScope and countByKind', () => {
  it('counts kinds over what a side and a search leave, not what a kind leaves', () => {
    const scope = targetsInScope(targets, names, { side: 'all', query: 'xbox' });

    expect([...countByKind(scope)]).toEqual([
      ['smoke', 1],
      ['flash', 1],
    ]);
  });
});
