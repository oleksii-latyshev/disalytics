import { Text } from '@disa/i18n';
import { Button } from '@disa/ui';
import { Layers, Trash2, Unlink, X } from 'lucide-react';
import type { Bulk } from '../helpers/lineup-bulk';

interface Props {
  count: number;
  bulk: Bulk;
  onMergeLandings: () => void;
  onMergeOrigins: () => void;
  onUngroup: () => void;
  onDelete: () => void;
  onClear: () => void;
}

/** What can be done to the ticked targets together. */
export function LineupBulkBar({
  count,
  bulk,
  onMergeLandings,
  onMergeOrigins,
  onUngroup,
  onDelete,
  onClear,
}: Props) {
  return (
    <div className="flex flex-col gap-1.5 rounded-card border border-line bg-surface-2 p-2">
      <div className="flex items-center justify-between gap-2">
        <span className="numeric text-11 font-medium text-ink">
          <Text path="library.lineups.selectedCount" values={{ count }} />
        </span>
        <Button variant="ghost" size="icon" onClick={onClear} className="size-6">
          <X aria-hidden="true" className="size-3.5" />
          <span className="sr-only">
            <Text path="library.lineups.clearSelection" />
          </span>
        </Button>
      </div>
      <div className="flex flex-wrap gap-1">
        {bulk.canMergeLandings && (
          <Button variant="outline" onClick={onMergeLandings} className="h-7 px-2 text-11">
            <Layers aria-hidden="true" className="size-3" />
            <Text path="library.lineups.mergeLandings" />
          </Button>
        )}
        {bulk.canMergeOrigins && (
          <Button variant="outline" onClick={onMergeOrigins} className="h-7 px-2 text-11">
            <Layers aria-hidden="true" className="size-3" />
            <Text path="library.lineups.mergeOrigins" />
          </Button>
        )}
        {bulk.canUngroup && (
          <Button variant="outline" onClick={onUngroup} className="h-7 px-2 text-11">
            <Unlink aria-hidden="true" className="size-3" />
            <Text path="library.lineups.unmerge" />
          </Button>
        )}
        {bulk.deletable.length > 0 && (
          <Button variant="destructive" onClick={onDelete} className="h-7 px-2 text-11">
            <Trash2 aria-hidden="true" className="size-3" />
            <Text path="library.lineups.deleteSelected" values={{ count: bulk.deletable.length }} />
          </Button>
        )}
      </div>
    </div>
  );
}
