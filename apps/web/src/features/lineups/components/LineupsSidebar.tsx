import type { LineupCollection, UtilityKind } from '@disa/demo-core';
import { useT } from '@disa/i18n';
import type { Bulk } from '../helpers/lineup-bulk';
import type { LineupScope } from '../helpers/lineup-scope';
import type { SavedTarget } from '../helpers/lineup-targets';
import { LineupBulkBar } from './LineupBulkBar';
import { LineupCollections } from './LineupCollections';
import { LineupFilters } from './LineupFilters';
import { LineupTargetList } from './LineupTargetList';

export interface CollectionsProps {
  collections: readonly LineupCollection[];
  counts: ReadonlyMap<string, number>;
  activeId: string | null;
  onSelect: (id: string | null) => void;
  onCreate: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (collection: LineupCollection) => void;
  onToggleMembers: (collectionId: string, lineupIds: readonly string[]) => void;
  onCreateWith: (name: string, lineupIds: readonly string[]) => void;
}

interface Props {
  collections: CollectionsProps;
  scope: LineupScope;
  onScope: (scope: LineupScope) => void;
  kindCounts: ReadonlyMap<UtilityKind, number>;
  /** How many lineups the open collection holds on this map, or the whole map without one. */
  totalCount: number;
  /** Every lineup of the map. */
  mapCount: number;
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
      className="surface-card flex min-h-0 min-w-0 flex-col gap-2.5 overflow-y-auto rounded-float p-3"
    >
      <LineupCollections
        collections={props.collections.collections}
        counts={props.collections.counts}
        totalCount={props.mapCount}
        activeId={props.collections.activeId}
        onSelect={props.collections.onSelect}
        onCreate={props.collections.onCreate}
        onRename={props.collections.onRename}
        onDelete={props.collections.onDelete}
      />
      <div className="flex shrink-0 flex-col gap-2.5">
        <LineupFilters
          scope={props.scope}
          onScope={props.onScope}
          kindCounts={props.kindCounts}
          totalCount={props.totalCount}
        />
      </div>
      <LineupTargetList
        targets={props.targets}
        selectedId={props.selectedId}
        hasLineups={props.mapCount > 0}
        collection={
          props.collections.activeId === null ? null : { hasMembers: props.totalCount > 0 }
        }
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
          collections={props.collections.collections}
          onToggleCollection={props.collections.onToggleMembers}
          onCreateCollection={props.collections.onCreateWith}
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
