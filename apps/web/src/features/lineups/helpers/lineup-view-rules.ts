import type { InteractionMode } from '../hooks/use-lineup-selection';

export type MergeTarget = 'origin' | 'landing' | undefined;

export interface MergeAvailability {
  readonly selected: boolean;
  readonly landings: boolean;
  readonly origins: boolean;
  readonly list: boolean;
}

export function focusedLineupIndex(selectedIndex: number, hoveredIndex: number): number | null {
  if (selectedIndex >= 0) return selectedIndex;
  return hoveredIndex >= 0 ? hoveredIndex : null;
}

export function mergeAvailability(
  mode: InteractionMode,
  selectedNodeCount: number,
  mergeTarget: MergeTarget,
): MergeAvailability {
  const isEditing = mode === 'edit';
  const hasNoNodes = selectedNodeCount === 0;
  return {
    selected: isEditing && hasNoNodes,
    landings: isEditing && (hasNoNodes || mergeTarget === 'landing'),
    origins: isEditing && (hasNoNodes || mergeTarget === 'origin'),
    list: hasNoNodes || mergeTarget !== undefined,
  };
}
