import { Text } from '@disa/i18n';
import { Button } from '@disa/ui';
import { Layers, Trash2, Unlink, X } from 'lucide-react';
import type { Bulk } from '../helpers/lineup-bulk';

interface Props {
  count: number;
  bulk: Bulk;
  onMergeLandings: () => void;
  onMergeOrigins: () => void;
  onUngroupLandings: () => void;
  onUngroupOrigins: () => void;
  onDelete: () => void;
  onClear: () => void;
}

const ACTION =
  'h-auto min-h-7 min-w-0 shrink max-w-full whitespace-normal px-2 py-1 text-start text-11';

/** What can be done to the ticked targets together. */
export function LineupBulkBar({
  count,
  bulk,
  onMergeLandings,
  onMergeOrigins,
  onUngroupLandings,
  onUngroupOrigins,
  onDelete,
  onClear,
}: Props) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 rounded-card border border-line bg-surface-2 p-2">
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
      <div className="flex min-w-0 flex-wrap gap-1">
        {bulk.canMergeLandings && (
          <Button variant="outline" onClick={onMergeLandings} className={ACTION}>
            <Layers aria-hidden="true" className="size-3" />
            <Text path="library.lineups.mergeLandings" />
          </Button>
        )}
        {bulk.canMergeOrigins && (
          <Button variant="outline" onClick={onMergeOrigins} className={ACTION}>
            <Layers aria-hidden="true" className="size-3" />
            <Text path="library.lineups.mergeOrigins" />
          </Button>
        )}
        {bulk.canUngroupLandings && (
          <Button variant="outline" onClick={onUngroupLandings} className={ACTION}>
            <Unlink aria-hidden="true" className="size-3" />
            <Text path="library.lineups.unmergeLandings" />
          </Button>
        )}
        {bulk.canUngroupOrigins && (
          <Button variant="outline" onClick={onUngroupOrigins} className={ACTION}>
            <Unlink aria-hidden="true" className="size-3" />
            <Text path="library.lineups.unmergeOrigins" />
          </Button>
        )}
        {bulk.deletable.length > 0 && (
          <Button variant="destructive" onClick={onDelete} className={ACTION}>
            <Trash2 aria-hidden="true" className="size-3" />
            <Text path="library.lineups.deleteSelected" values={{ count: bulk.deletable.length }} />
          </Button>
        )}
      </div>
    </div>
  );
}
