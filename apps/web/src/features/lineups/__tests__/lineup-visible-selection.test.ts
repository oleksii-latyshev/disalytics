import { describe, expect, it } from 'vitest';
import type { SelectedLineupNode } from '../helpers/lineup-nodes';
import { visibleLineupSelection } from '../helpers/lineup-visible-selection';
import { resolveMergeTarget } from '../hooks/use-lineup-selection';

const origin: SelectedLineupNode = {
  lineupId: 'lineup-a',
  lineupIndex: 0,
  target: 'origin',
};

const hiddenLanding: SelectedLineupNode = {
  lineupId: 'lineup-b',
  lineupIndex: 1,
  target: 'landing',
};

describe('visible lineup selection', () => {
  it('keeps hidden node and lineup selections out of visible actions', () => {
    const selection = visibleLineupSelection(
      [{ id: 'lineup-a' }],
      new Set(['lineup-a', 'lineup-b']),
      [origin, hiddenLanding],
    );

    expect(selection.selectedNodes).toEqual([origin]);
    expect(selection.selectedLineupIds).toEqual(new Set(['lineup-a']));
    expect(resolveMergeTarget(selection.selectedNodes)).toBeUndefined();
  });

  it('resolves a merge target from visible nodes on distinct visible lineups', () => {
    const selection = visibleLineupSelection([{ id: 'lineup-a' }, { id: 'lineup-b' }], new Set(), [
      origin,
      { ...origin, lineupId: 'lineup-b', lineupIndex: 1 },
    ]);

    expect(selection.selectedNodes).toHaveLength(2);
    expect(resolveMergeTarget(selection.selectedNodes)).toBe('origin');
  });
});
