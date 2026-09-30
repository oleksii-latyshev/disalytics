import type { Lineup } from '@disa/demo-core';
import type { SelectedLineupNode } from '../helpers/lineup-layer';
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

export function createLineupSelectionActions({
  mode,
  filteredLineups,
  originGroups,
  landingGroups,
  setSelectedId,
  setSelectedIds,
  setSelectedNodes,
  setSelectedVariants,
  setDetailLineup,
}: Params) {
  const handleToggleSelectId = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
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
    const { index, target } = hit;
    const targetGroups = target === 'landing' ? landingGroups : originGroups;
    const group = targetGroups.find(({ indices }) => indices.includes(index));

    if (group !== undefined && group.indices.length > 1) {
      setSelectedVariants({
        type: target,
        ids: group.indices.flatMap((position) => {
          const lineup = filteredLineups[position];
          return lineup === undefined ? [] : [lineup.id];
        }),
      });
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
