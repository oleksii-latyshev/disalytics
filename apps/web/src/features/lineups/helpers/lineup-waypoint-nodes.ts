import type { SelectedLineupNode } from './lineup-nodes';

function afterWaypointRemoval(
  node: SelectedLineupNode,
  removedIndex: number,
): SelectedLineupNode | null {
  if (node.waypointIndex === removedIndex) return null;
  if (node.waypointIndex !== undefined && node.waypointIndex > removedIndex) {
    return { ...node, waypointIndex: node.waypointIndex - 1 };
  }
  return node;
}

export function shiftNodesAfterWaypointRemoval(
  nodes: readonly SelectedLineupNode[],
  lineupId: string,
  removedIndex: number,
): readonly SelectedLineupNode[] {
  return nodes.flatMap((node) => {
    if (node.lineupId !== lineupId || node.target !== 'waypoint') return [node];
    const shifted = afterWaypointRemoval(node, removedIndex);
    return shifted === null ? [] : [shifted];
  });
}
