import { useState } from 'react';
import { bulkOf } from '../helpers/lineup-bulk';
import type { SavedTarget } from '../helpers/lineup-targets';

const NO_CHECKED: ReadonlySet<string> = new Set();

/** The targets ticked in the list while it is in selection mode, and what can be done to them. */
export function useBulkSelection(targets: readonly SavedTarget[]) {
  const [isSelecting, setIsSelecting] = useState(false);
  const [checkedIds, setCheckedIds] = useState(NO_CHECKED);

  return {
    isSelecting,
    checkedIds,
    bulk: bulkOf(targets.filter((target) => checkedIds.has(target.id))),
    toggle: (id: string) =>
      setCheckedIds((current) => {
        const next = new Set(current);
        if (!next.delete(id)) next.add(id);
        return next;
      }),
    toggleSelecting: () => {
      setIsSelecting((current) => !current);
      setCheckedIds(NO_CHECKED);
    },
    stopSelecting: () => {
      setIsSelecting(false);
      setCheckedIds(NO_CHECKED);
    },
    clear: () => setCheckedIds(NO_CHECKED),
  };
}
