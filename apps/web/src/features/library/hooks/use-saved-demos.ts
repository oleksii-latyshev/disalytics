import type { SavedDemo } from '@disa/demo-store';
import { useCallback, useEffect, useState } from 'react';
import { forgetSavedDemo, listSavedDemos } from '@/core/parsing';

export interface SavedDemos {
  /** `null` until the store has answered, so an empty cache never flashes a list on its way in. */
  demos: readonly SavedDemo[] | null;
  forget: (key: string) => void;
}

export function useSavedDemos(): SavedDemos {
  const [demos, setDemos] = useState<readonly SavedDemo[] | null>(null);

  useEffect(() => {
    let listening = true;

    void listSavedDemos().then((listed) => {
      if (listening) setDemos(listed);
    });

    return () => {
      listening = false;
    };
  }, []);

  // The row goes at once — DESIGN.md §10.2 makes removal immediate and unconfirmed, and what it
  // deletes is a cache entry rather than the reader's file. The store catches up behind it.
  const forget = useCallback((key: string) => {
    setDemos((current) => current?.filter((demo) => demo.key !== key) ?? null);
    void forgetSavedDemo(key);
  }, []);

  return { demos, forget };
}
