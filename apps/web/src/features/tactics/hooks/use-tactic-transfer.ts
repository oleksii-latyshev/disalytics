import type { Tactic } from '@disa/demo-core';
import { openTacticStore } from '@disa/demo-store';
import { useCallback, useEffect, useState } from 'react';
import { TACTIC_READ_OPTIONS } from '../helpers/tactic-transfer';

async function readLibrary(): Promise<readonly Tactic[]> {
  const store = await openTacticStore(TACTIC_READ_OPTIONS);
  if (store === null) return [];
  try {
    return await store.list();
  } finally {
    store.close();
  }
}

/** The stored library, for counting and for spotting clashes, and the way to write what is imported. */
export function useTacticTransfer(isOpen: boolean) {
  const [library, setLibrary] = useState<readonly Tactic[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    let isCurrent = true;
    readLibrary()
      .then((list) => {
        if (isCurrent) setLibrary(list);
      })
      .catch(() => undefined);
    return () => {
      isCurrent = false;
    };
  }, [isOpen]);

  const write = useCallback(async (tactics: readonly Tactic[]) => {
    const store = await openTacticStore(TACTIC_READ_OPTIONS);
    if (store === null) throw new Error('the tactic store is not available');
    try {
      await store.putMany(tactics);
      setLibrary(await store.list());
    } finally {
      store.close();
    }
  }, []);

  return { library, readLibrary, write };
}
