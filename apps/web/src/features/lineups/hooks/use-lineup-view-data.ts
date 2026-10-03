import type { Lineup, UtilityKind } from '@disa/demo-core';
import { useMemo } from 'react';
import { filterLineups } from '../helpers/lineup-filter';
import type { SelectedLineupNode } from '../helpers/lineup-nodes';
import { groupLineupsByLanding, groupLineupsByOrigin } from '../helpers/lineup-plot';
import { visibleLineupSelection } from '../helpers/lineup-visible-selection';
import type { SelectedVariants } from './use-lineup-selection';
import { resolveMergeTarget } from './use-lineup-selection';

export function useLineupViewData({
  lineups,
  side,
  kind,
  search,
  selectedId,
  hoveredId,
  selectedIds,
  selectedNodes,
  selectedVariants,
}: {
  readonly lineups: readonly Lineup[];
  readonly side: 'ALL' | 'CT' | 'T';
  readonly kind: 'all' | UtilityKind;
  readonly search: string;
  readonly selectedId: string | null;
  readonly hoveredId: string | null;
  readonly selectedIds: ReadonlySet<string>;
  readonly selectedNodes: readonly SelectedLineupNode[];
  readonly selectedVariants: SelectedVariants | null;
}) {
  const filteredLineups = useMemo(
    () => filterLineups(lineups, { side, kind, search }),
    [lineups, side, kind, search],
  );
  const selectedIndex = filteredLineups.findIndex((lineup) => lineup.id === selectedId);
  const hoveredIndex = filteredLineups.findIndex((lineup) => lineup.id === hoveredId);
  const originGroups = useMemo(() => groupLineupsByOrigin(filteredLineups), [filteredLineups]);
  const landingGroups = useMemo(() => groupLineupsByLanding(filteredLineups), [filteredLineups]);
  const selectedGroup =
    selectedVariants?.ids.flatMap((id) => filteredLineups.filter((item) => item.id === id)) ?? [];
  const { selectedNodes: visibleSelectedNodes, selectedLineupIds } = useMemo(
    () => visibleLineupSelection(filteredLineups, selectedIds, selectedNodes),
    [filteredLineups, selectedIds, selectedNodes],
  );

  return {
    filteredLineups,
    selectedIndex,
    hoveredIndex,
    originGroups,
    landingGroups,
    selectedGroup,
    selectedNodes: visibleSelectedNodes,
    selectedLineupIds,
    mergeTarget: resolveMergeTarget(visibleSelectedNodes),
  };
}
