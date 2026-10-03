import { describe, expect, it } from 'vitest';
import { isLineupNodeSelected, type SelectedLineupNode } from '../helpers/lineup-nodes';

const selectedNodes: readonly SelectedLineupNode[] = [
  { lineupId: 'lineup-a', lineupIndex: 0, target: 'origin' },
  { lineupId: 'lineup-b', lineupIndex: 3, target: 'landing' },
  { lineupId: 'lineup-b', lineupIndex: 3, target: 'waypoint', waypointIndex: 1 },
];

describe('lineup node selection identity', () => {
  it('matches stable lineup ids and exact node targets after lineup reordering', () => {
    expect(isLineupNodeSelected(selectedNodes, 'lineup-b', 'landing')).toBe(true);
    expect(isLineupNodeSelected(selectedNodes, 'lineup-b', 'origin')).toBe(false);
    expect(isLineupNodeSelected(selectedNodes, 'lineup-a', 'origin')).toBe(true);
  });

  it('matches the selected bounce index without selecting adjacent bounces', () => {
    expect(isLineupNodeSelected(selectedNodes, 'lineup-b', 'waypoint', 1)).toBe(true);
    expect(isLineupNodeSelected(selectedNodes, 'lineup-b', 'waypoint', 0)).toBe(false);
  });
});
