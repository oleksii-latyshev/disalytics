import type { LineupNode } from './lineup-plot';

export interface ActiveDragPoint {
  readonly target: 'origin' | 'landing' | 'waypoint';
  readonly waypointIndex?: number | undefined;
  readonly radarX: number;
  readonly radarY: number;
}

export interface SelectedLineupNode extends LineupNode {
  readonly lineupId: string;
}

export function isLineupNodeSelected(
  selectedNodes: readonly SelectedLineupNode[] | undefined,
  lineupId: string,
  target: LineupNode['target'],
  waypointIndex?: number,
): boolean {
  if (selectedNodes === undefined) return false;
  for (const node of selectedNodes) {
    if (
      node.lineupId === lineupId &&
      node.target === target &&
      (target !== 'waypoint' || node.waypointIndex === waypointIndex)
    ) {
      return true;
    }
  }
  return false;
}
