import type { LineupTarget, UtilityKind } from '@disa/demo-core';
import type { TargetNames } from './lineup-names';
import type { SideScope } from './map-scope';

export type KindScope = 'all' | UtilityKind;

export interface LineupFilter {
  readonly kind: KindScope;
  readonly side: SideScope;
  readonly query: string;
}

export const NO_FILTER: LineupFilter = { kind: 'all', side: 'all', query: '' };

function isOnSide(target: LineupTarget, side: SideScope): boolean {
  return side === 'all' || target.side === 'BOTH' || target.side === side;
}

/** The targets a side and a search leave — the set the kind chips count over. */
export function targetsInScope(
  targets: readonly LineupTarget[],
  names: ReadonlyMap<string, TargetNames>,
  filter: Pick<LineupFilter, 'side' | 'query'>,
): readonly LineupTarget[] {
  const query = filter.query.trim().toLowerCase();

  return targets.filter(
    (target) =>
      isOnSide(target, filter.side) &&
      (query === '' || (names.get(target.id)?.searchText ?? '').includes(query)),
  );
}

export function filterTargets(
  targets: readonly LineupTarget[],
  names: ReadonlyMap<string, TargetNames>,
  filter: LineupFilter,
): readonly LineupTarget[] {
  const inScope = targetsInScope(targets, names, filter);

  return filter.kind === 'all' ? inScope : inScope.filter((target) => target.kind === filter.kind);
}

export function countByKind(targets: readonly LineupTarget[]): ReadonlyMap<UtilityKind, number> {
  const counts = new Map<UtilityKind, number>();

  for (const { kind } of targets) counts.set(kind, (counts.get(kind) ?? 0) + 1);

  return counts;
}
