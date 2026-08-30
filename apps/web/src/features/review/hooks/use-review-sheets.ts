import { useCallback, useState } from 'react';
import type { Transport } from '@/core/playback';

/** What can cover the stage. §7.3's match overlay is one of these in every way that matters here. */
export type Sheet = 'settings' | 'help' | 'match';

export interface ReviewSheets {
  /** Which surface covers the screen, if any. `null` is the stage uncovered. */
  readonly openSheet: Sheet | null;
  readonly showSheet: (sheet: Sheet) => void;
  readonly dismissSheet: () => void;
}

/**
 * The surfaces that cover the stage — DESIGN.md §5.1 and §10.5.
 *
 * **Raising one pauses playback**, which is what makes covering the plate legitimate rather than an
 * exception to principle 4: §5.1 allows it exactly when the plate is not the thing being read. The
 * open surface is also what suspends §9.1's bindings, because `Esc` belongs to the dialog while a
 * dialog is up — that is the one thread between this and the keyboard table.
 */
export function useReviewSheets(transport: Transport): ReviewSheets {
  const [openSheet, setOpenSheet] = useState<Sheet | null>(null);

  const showSheet = useCallback(
    (sheet: Sheet) => {
      transport.pause();
      setOpenSheet(sheet);
    },
    [transport],
  );

  const dismissSheet = useCallback(() => setOpenSheet(null), []);

  return { openSheet, showSheet, dismissSheet };
}
