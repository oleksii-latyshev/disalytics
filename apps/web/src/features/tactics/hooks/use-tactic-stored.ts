import { openTacticStore } from '@disa/demo-store';
import { useEffect, useState } from 'react';

/**
 * Whether a tactic with this id is already in the store: `true`, `false`, or `null` while the
 * lookup runs. An unreachable store reads as `null` too, which callers treat as stored.
 */
export function useTacticStored(id: string): boolean | null {
  const [isStored, setIsStored] = useState<boolean | null>(null);

  useEffect(() => {
    let isCurrent = true;
    openTacticStore()
      .then(async (store) => {
        if (store === null) return;
        try {
          const found = await store.get(id);
          if (isCurrent) setIsStored(found !== null);
        } finally {
          store.close();
        }
      })
      .catch(() => undefined);
    return () => {
      isCurrent = false;
    };
  }, [id]);

  return isStored;
}
