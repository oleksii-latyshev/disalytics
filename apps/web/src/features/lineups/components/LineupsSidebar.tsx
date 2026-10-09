import type { UtilityKind } from '@disa/demo-core';
import { useT } from '@disa/i18n';
import type { Bulk } from '../helpers/lineup-bulk';
import type { LineupScope } from '../helpers/lineup-scope';
import type { SavedTarget } from '../helpers/lineup-targets';
import { LineupBulkBar } from './LineupBulkBar';
import { LineupFilters } from './LineupFilters';
import { LineupTargetList } from './LineupTargetList';

interface Props {
  scope: LineupScope;
  onScope: (scope: LineupScope) => void;
  kindCounts: ReadonlyMap<UtilityKind, number>;
  totalCount: number;
  targets: readonly SavedTarget[];
  selectedId: string | null;
  isSelecting: boolean;
  checkedIds: ReadonlySet<string>;
  bulk: Bulk;
  onPick: (id: string) => void;
  onCheck: (id: string) => void;
  onToggleSelecting: () => void;
  onClearChecked: () => void;
  onMergeLandings: () => void;
  onMergeOrigins: () => void;
  onUngroupLandings: () => void;
  onUngroupOrigins: () => void;
  onDelete: () => void;
}

/** The left column: what to look for, and every target that matches. */
export function LineupsSidebar(props: Props) {
  const t = useT();

  return (
    <aside
      aria-label={t('library.lineups.sidebar')}
      className="surface-card flex min-h-0 min-w-0 flex-col gap-2.5 rounded-float p-3"
    >
      <LineupFilters
        scope={props.scope}
        onScope={props.onScope}
        kindCounts={props.kindCounts}
        totalCount={props.totalCount}
      />
      <LineupTargetList
        targets={props.targets}
        selectedId={props.selectedId}
        hasLineups={props.totalCount > 0}
        isSelecting={props.isSelecting}
        checkedIds={props.checkedIds}
        onPick={props.onPick}
        onCheck={props.onCheck}
        onToggleSelecting={props.onToggleSelecting}
      />
      {props.isSelecting && props.checkedIds.size > 0 && (
        <LineupBulkBar
          count={props.checkedIds.size}
          bulk={props.bulk}
          onMergeLandings={props.onMergeLandings}
          onMergeOrigins={props.onMergeOrigins}
          onUngroupLandings={props.onUngroupLandings}
          onUngroupOrigins={props.onUngroupOrigins}
          onDelete={props.onDelete}
          onClear={props.onClearChecked}
        />
      )}
    </aside>
  );
}
