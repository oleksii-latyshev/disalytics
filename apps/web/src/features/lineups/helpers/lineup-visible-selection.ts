import type { Lineup } from '@disa/demo-core';
import type { SelectedLineupNode } from './lineup-layer';

export interface VisibleLineupSelection {
  readonly selectedNodes: readonly SelectedLineupNode[];
  readonly selectedLineupIds: ReadonlySet<string>;
}

export function visibleLineupSelection(
  visibleLineups: readonly Pick<Lineup, 'id'>[],
  selectedIds: ReadonlySet<string>,
  selectedNodes: readonly SelectedLineupNode[],
): VisibleLineupSelection {
  const visibleIds = new Set(visibleLineups.map((lineup) => lineup.id));
  const visibleSelectedNodes = selectedNodes.filter((node) => visibleIds.has(node.lineupId));
  const visibleSelectedIds = new Set<string>();

  for (const id of selectedIds) {
    if (visibleIds.has(id)) visibleSelectedIds.add(id);
  }
  for (const node of visibleSelectedNodes) {
    visibleSelectedIds.add(node.lineupId);
  }

  return {
    selectedNodes: visibleSelectedNodes,
    selectedLineupIds: visibleSelectedIds,
  };
}
