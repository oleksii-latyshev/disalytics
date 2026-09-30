import { describe, expect, it } from 'vitest';
import type { SelectedLineupNode } from '../helpers/lineup-layer';
import { resolveMergeTarget, updateSelectedNodes } from '../hooks/use-lineup-selection';

const origin: SelectedLineupNode = {
  lineupIndex: 0,
  target: 'origin',
  lineupId: 'lineup-a',
};

const landing: SelectedLineupNode = {
  lineupIndex: 1,
  target: 'landing',
  lineupId: 'lineup-b',
};

const bounce: SelectedLineupNode = {
  lineupIndex: 1,
  target: 'waypoint',
  waypointIndex: 0,
  lineupId: 'lineup-b',
};

describe('selected lineup nodes', () => {
  it('adds ordinary clicks while retaining the previously selected node identities', () => {
    const selected = updateSelectedNodes([origin], landing, false);

    expect(selected).toEqual([origin, landing]);
    expect(selected[0]).toBe(origin);
  });

  it('keeps origin, landing, and waypoint nodes distinct for one lineup', () => {
    expect(updateSelectedNodes([origin], { ...origin, target: 'landing' }, false)).toEqual([
      origin,
      { ...origin, target: 'landing' },
    ]);
    expect(updateSelectedNodes([landing], bounce, false)).toEqual([landing, bounce]);
  });

  it('modifier clicks toggle only the matching lineup node identity', () => {
    expect(updateSelectedNodes([origin, landing], origin, true)).toEqual([landing]);
    expect(updateSelectedNodes([origin], landing, true)).toEqual([origin, landing]);
    expect(updateSelectedNodes([bounce], { ...bounce, waypointIndex: 1 }, true)).toEqual([
      bounce,
      { ...bounce, waypointIndex: 1 },
    ]);
  });

  it('uses an explicit merge target only for same-target nodes from distinct lineups', () => {
    expect(resolveMergeTarget([origin, { ...origin, lineupId: 'lineup-b' }])).toBe('origin');
    expect(resolveMergeTarget([landing, bounce])).toBeUndefined();
    expect(resolveMergeTarget([origin, landing])).toBeUndefined();
    expect(resolveMergeTarget([origin, { ...origin, target: 'origin' }])).toBeUndefined();
  });
});
