import { Text } from '@disa/i18n';
import { CornerDownRight, Layers, Pencil, Trash2, Unlink } from 'lucide-react';
import type { ContextMenuData, LineupPlateProps } from './lineup-plate-types';

export function LineupPlateContextMenu({
  contextMenu,
  plateProps,
  onDismiss,
}: {
  readonly contextMenu: ContextMenuData | null;
  readonly plateProps: LineupPlateProps;
  readonly onDismiss: () => void;
}) {
  const {
    mode = 'view',
    selectedIds,
    onDeleteSelected,
    onMergeSelected,
    onMergeLandings,
    onMergeOrigins,
    onDeleteBounceFromLineup,
    onUnmergeLineup,
    onAddBounceToLineup,
    onEditLineup,
    onDeleteLineup,
  } = plateProps;

  if (contextMenu === null || mode !== 'edit') return null;

  return (
    <div
      role="menu"
      tabIndex={-1}
      style={{ top: contextMenu.y, left: contextMenu.x }}
      className="fixed z-50 flex min-w-[12rem] flex-col gap-0.5 rounded-card border border-line bg-surface-1 p-1 text-12 shadow-card"
    >
      {selectedIds.size >= 2 && onDeleteSelected && (
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onDeleteSelected();
            onDismiss();
          }}
          className="flex items-center gap-2 rounded-chip px-2.5 py-1.5 text-left text-damage hover:bg-surface-2"
        >
          <Trash2 className="size-3.5" />
          <Text path="library.lineups.deleteSelected" values={{ count: selectedIds.size }} />
        </button>
      )}

      {selectedIds.size >= 2 && mode === 'edit' && (onMergeLandings || onMergeOrigins) && (
        <>
          {onMergeLandings && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onMergeLandings();
                onDismiss();
              }}
              className="flex items-center gap-2 rounded-chip px-2.5 py-1.5 text-left text-ink hover:bg-surface-2"
            >
              <Layers className="size-3.5 text-primary" />
              <Text path="library.lineups.mergeLandings" />
            </button>
          )}
          {onMergeOrigins && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onMergeOrigins();
                onDismiss();
              }}
              className="flex items-center gap-2 rounded-chip px-2.5 py-1.5 text-left text-ink hover:bg-surface-2"
            >
              <Layers className="size-3.5 text-primary" />
              <Text path="library.lineups.mergeOrigins" />
            </button>
          )}
        </>
      )}

      {selectedIds.size >= 2 && mode !== 'edit' && onMergeSelected && (
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onMergeSelected();
            onDismiss();
          }}
          className="flex items-center gap-2 rounded-chip px-2.5 py-1.5 text-left text-ink hover:bg-surface-2"
        >
          <Layers className="size-3.5 text-primary" />
          <Text path="library.lineups.mergeSelected" values={{ count: selectedIds.size }} />
        </button>
      )}

      {contextMenu.hitWaypointIndex !== null &&
        contextMenu.hitLineup &&
        onDeleteBounceFromLineup && (
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              if (contextMenu.hitLineup && contextMenu.hitWaypointIndex !== null) {
                onDeleteBounceFromLineup(contextMenu.hitLineup.id, contextMenu.hitWaypointIndex);
              }
              onDismiss();
            }}
            className="flex items-center gap-2 rounded-chip px-2.5 py-1.5 text-left text-damage hover:bg-surface-2"
          >
            <Trash2 className="size-3.5" />
            <Text path="library.lineups.deleteBounce" />
          </button>
        )}

      {contextMenu.hitLineup && (
        <>
          {contextMenu.hitLineup.groupId && onUnmergeLineup && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                if (contextMenu.hitLineup) {
                  onUnmergeLineup(contextMenu.hitLineup.id);
                }
                onDismiss();
              }}
              className="flex items-center gap-2 rounded-chip px-2.5 py-1.5 text-left text-ink hover:bg-surface-2"
            >
              <Unlink className="size-3.5" />
              <Text path="library.lineups.unmerge" />
            </button>
          )}

          {onAddBounceToLineup && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                if (contextMenu.hitLineup) {
                  onAddBounceToLineup(contextMenu.hitLineup.id);
                }
                onDismiss();
              }}
              className="flex items-center gap-2 rounded-chip px-2.5 py-1.5 text-left text-ink hover:bg-surface-2"
            >
              <CornerDownRight className="size-3.5" />
              <Text path="library.lineups.addBouncePoint" />
            </button>
          )}

          {onEditLineup && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                if (contextMenu.hitLineup) {
                  onEditLineup(contextMenu.hitLineup);
                }
                onDismiss();
              }}
              className="flex items-center gap-2 rounded-chip px-2.5 py-1.5 text-left text-ink hover:bg-surface-2"
            >
              <Pencil className="size-3.5" />
              <Text path="library.lineups.edit" />
            </button>
          )}

          {onDeleteLineup && !contextMenu.hitLineup.isBuiltIn && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                if (contextMenu.hitLineup) {
                  onDeleteLineup(contextMenu.hitLineup.id);
                }
                onDismiss();
              }}
              className="flex items-center gap-2 rounded-chip px-2.5 py-1.5 text-left text-damage hover:bg-surface-2"
            >
              <Trash2 className="size-3.5" />
              <Text path="library.lineups.delete" />
            </button>
          )}
        </>
      )}

      <div className="my-0.5 border-t border-line" />
      <button
        type="button"
        role="menuitem"
        onClick={() => onDismiss()}
        className="flex items-center rounded-chip px-2.5 py-1 text-left text-11 text-ink-dim hover:bg-surface-2"
      >
        <Text path="library.lineups.form.close" />
      </button>
    </div>
  );
}
