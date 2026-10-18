import type { Tactic } from '@disa/demo-core';
import { openTacticStore } from '@disa/demo-store';
import { useCallback, useEffect, useState } from 'react';

export interface RoundTacticSave {
  /** The tactic kept under the id, or `undefined` while none is. */
  readonly saved: Tactic | undefined;
  readonly isSaving: boolean;
  readonly hasFailed: boolean;
  readonly save: (tactic: Tactic) => void;
  readonly undo: () => void;
}

/**
 * Whether the tactic under `id` is in the reader's library, read from the store itself so it is true
 * after a reload and after saving from another tab. The store is opened for each read or write and
 * closed again; nothing here runs while a frame is drawn.
 */
export function useRoundTacticSave(id: string): RoundTacticSave {
  const [saved, setSaved] = useState<Tactic | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);

  useEffect(() => {
    let isCurrent = true;
    setSaved(undefined);
    setHasFailed(false);
    openTacticStore()
      .then(async (store) => {
        if (store === null) return;
        try {
          const found = await store.get(id);
          if (isCurrent) setSaved(found ?? undefined);
        } finally {
          store.close();
        }
      })
      .catch(() => undefined);
    return () => {
      isCurrent = false;
    };
  }, [id]);

  const write = useCallback(
    async (
      change: (store: NonNullable<Awaited<ReturnType<typeof openTacticStore>>>) => Promise<void>,
    ) => {
      setIsSaving(true);
      setHasFailed(false);
      try {
        const store = await openTacticStore();
        if (store === null) throw new Error('no tactic store');
        try {
          await change(store);
        } finally {
          store.close();
        }
        return true;
      } catch {
        setHasFailed(true);
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [],
  );

  const save = useCallback(
    (tactic: Tactic) => {
      const now = Date.now();
      const stamped = { ...tactic, createdAt: saved?.createdAt ?? now, updatedAt: now };
      void write((store) => store.put(stamped)).then((isDone) => {
        if (isDone) setSaved(stamped);
      });
    },
    [saved, write],
  );

  const undo = useCallback(() => {
    void write((store) => store.delete(id)).then((isDone) => {
      if (isDone) setSaved(undefined);
    });
  }, [id, write]);

  return { saved, isSaving, hasFailed, save, undo };
}
