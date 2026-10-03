import type { Lineup } from '@disa/demo-core';
import type { SelectedLineupNode } from '../helpers/lineup-nodes';
import type { LineupGroup, LineupHit, LineupNode } from '../helpers/lineup-plot';

export type InteractionMode = 'view' | 'edit';

export interface SelectedVariants {
  readonly type: 'origin' | 'landing';
  readonly ids: readonly string[];
}

export function resolveMergeTarget(
  selectedNodes: readonly SelectedLineupNode[],
): 'origin' | 'landing' | undefined {
  const distinctLineupIds = new Set(selectedNodes.map((node) => node.lineupId));
  const target = selectedNodes[0]?.target;
  if (
    distinctLineupIds.size < 2 ||
    !selectedNodes.every((node) => node.target === target) ||
    (target !== 'origin' && target !== 'landing')
  ) {
    return undefined;
  }
  return target;
}

interface Params {
  readonly mode: InteractionMode;
  readonly filteredLineups: readonly Lineup[];
  readonly originGroups: readonly LineupGroup[];
  readonly landingGroups: readonly LineupGroup[];
  readonly selectedIds: ReadonlySet<string>;
  readonly selectedNodes: readonly SelectedLineupNode[];
  readonly setSelectedId: React.Dispatch<React.SetStateAction<string | null>>;
  readonly setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  readonly setSelectedNodes: React.Dispatch<React.SetStateAction<readonly SelectedLineupNode[]>>;
  readonly setSelectedVariants: React.Dispatch<React.SetStateAction<SelectedVariants | null>>;
  readonly setDetailLineup: React.Dispatch<React.SetStateAction<Lineup | null>>;
}

export function updateSelectedNodes(
  current: readonly SelectedLineupNode[],
  selected: SelectedLineupNode,
  modifierKey: boolean,
): readonly SelectedLineupNode[] {
  const matches = (node: SelectedLineupNode) =>
    node.lineupId === selected.lineupId &&
    node.target === selected.target &&
    node.waypointIndex === selected.waypointIndex;

  if (modifierKey) {
    return current.some(matches)
      ? current.filter((node) => !matches(node))
      : [...current, selected];
  }

  return current.some(matches) ? current : [...current, selected];
}

export function toggleLineupSelection(
  id: string,
  selectedIds: ReadonlySet<string>,
  selectedNodes: readonly SelectedLineupNode[],
): {
  readonly selectedIds: ReadonlySet<string>;
  readonly selectedNodes: readonly SelectedLineupNode[];
} {
  const isSelected = selectedIds.has(id) || selectedNodes.some((node) => node.lineupId === id);
  if (isSelected) {
    return {
      selectedIds: new Set([...selectedIds].filter((selectedId) => selectedId !== id)),
      selectedNodes: selectedNodes.filter((node) => node.lineupId !== id),
    };
  }

  return { selectedIds: new Set([...selectedIds, id]), selectedNodes };
}

export function variantsAtHit(
  hit: LineupHit,
  filteredLineups: readonly Pick<Lineup, 'id'>[],
  originGroups: readonly LineupGroup[],
  landingGroups: readonly LineupGroup[],
): SelectedVariants | null {
  const targetGroups = hit.target === 'landing' ? landingGroups : originGroups;
  const group = targetGroups.find(({ indices }) => indices.includes(hit.index));
  if (group === undefined || group.indices.length < 2) return null;

  return {
    type: hit.target,
    ids: group.indices.flatMap((position) => {
      const lineup = filteredLineups[position];
      return lineup === undefined ? [] : [lineup.id];
    }),
  };
}

export function createLineupSelectionActions({
  mode,
  filteredLineups,
  originGroups,
  landingGroups,
  selectedIds,
  selectedNodes,
  setSelectedId,
  setSelectedIds,
  setSelectedNodes,
  setSelectedVariants,
  setDetailLineup,
}: Params) {
  const handleToggleSelectId = (id: string) => {
    const next = toggleLineupSelection(id, selectedIds, selectedNodes);
    setSelectedIds(new Set(next.selectedIds));
    setSelectedNodes(next.selectedNodes);
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
    setSelectedNodes([]);
  };

  const handleSelectMarker = (hit: LineupHit | null, modifierKey?: boolean) => {
    if (hit === null) {
      if (!modifierKey) {
        setSelectedId(null);
        setSelectedIds(new Set());
        setSelectedNodes([]);
      }
      return;
    }
    const single = filteredLineups[hit.index];
    if (single === undefined) return;

    if (mode === 'edit') {
      if (modifierKey) {
        handleToggleSelectId(single.id);
      } else {
        setSelectedId(single.id);
        setSelectedIds(new Set());
      }
      return;
    }

    // View mode inspects the clicked marker, regardless of modifiers.
    const variants = variantsAtHit(hit, filteredLineups, originGroups, landingGroups);
    if (variants !== null) {
      setSelectedVariants(variants);
      return;
    }

    setSelectedId(single.id);
    setDetailLineup(single);
  };

  const handleSelectNode = (node: LineupNode | null, modifierKey?: boolean) => {
    if (node === null) {
      if (!modifierKey) {
        setSelectedNodes([]);
        setSelectedId(null);
        setSelectedIds(new Set());
      }
      return;
    }

    const lineup = filteredLineups[node.lineupIndex];
    if (lineup === undefined) return;
    setSelectedId(lineup.id);
    const selectedNode: SelectedLineupNode = { ...node, lineupId: lineup.id };

    setSelectedNodes((prev) => updateSelectedNodes(prev, selectedNode, modifierKey ?? false));
  };

  return {
    handleToggleSelectId,
    handleClearSelection,
    handleSelectMarker,
    handleSelectNode,
  };
}
