import { describe, expect, it } from 'vitest';
import type { SelectedLineupNode } from '../helpers/lineup-nodes';
import { shiftNodesAfterWaypointRemoval } from '../helpers/lineup-waypoint-nodes';

function waypoint(lineupId: string, waypointIndex: number): SelectedLineupNode {
  return { lineupIndex: 0, target: 'waypoint', waypointIndex, lineupId };
}

describe('shiftNodesAfterWaypointRemoval', () => {
  it('drops the removed waypoint and shifts the ones after it', () => {
    const nodes = [waypoint('a', 0), waypoint('a', 1), waypoint('a', 2)];

    expect(shiftNodesAfterWaypointRemoval(nodes, 'a', 1)).toEqual([
      waypoint('a', 0),
      waypoint('a', 1),
    ]);
  });

  it('leaves other lineups and non-waypoint nodes untouched', () => {
    const origin: SelectedLineupNode = { lineupIndex: 0, target: 'origin', lineupId: 'a' };
    const nodes = [origin, waypoint('b', 2)];

    expect(shiftNodesAfterWaypointRemoval(nodes, 'a', 0)).toEqual(nodes);
  });
});
