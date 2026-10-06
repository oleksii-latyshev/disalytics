import type { Tactic } from '@disa/demo-core';
import { openTacticStore, type TacticStore } from '@disa/demo-store';
import { useCallback, useEffect, useRef, useState } from 'react';
import { generateId } from '../helpers/editor-actions';
import { renewedPlans } from '../helpers/tactic-copy';
import { TACTIC_READ_OPTIONS } from '../helpers/tactic-transfer';

export function useTactics() {
  const [tactics, setTactics] = useState<readonly Tactic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const storeRef = useRef<TacticStore | null>(null);

  const reload = useCallback(async () => {
    try {
      if (!storeRef.current) {
        storeRef.current = await openTacticStore(TACTIC_READ_OPTIONS);
      }
      if (storeRef.current) {
        const list = await storeRef.current.list();
        setTactics(list);
      }
    } catch {
      // IndexedDB failure or inaccessible
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    openTacticStore(TACTIC_READ_OPTIONS).then((store) => {
      if (!mounted) {
        store?.close();
        return;
      }
      storeRef.current = store;
      if (store) {
        store.list().then((list) => {
          if (mounted) {
            setTactics(list);
            setIsLoading(false);
          }
        });
      } else {
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      storeRef.current?.close();
      storeRef.current = null;
    };
  }, []);

  const saveTactic = useCallback(async (tactic: Tactic) => {
    if (!storeRef.current) {
      storeRef.current = await openTacticStore(TACTIC_READ_OPTIONS);
    }
    if (storeRef.current) {
      await storeRef.current.put(tactic);
    }
    setTactics((prev) => {
      const idx = prev.findIndex((t) => t.id === tactic.id);
      if (idx === -1) {
        return [tactic, ...prev];
      }
      const next = [...prev];
      next[idx] = tactic;
      return next;
    });
  }, []);

  const deleteTactic = useCallback(async (id: string) => {
    if (!storeRef.current) {
      storeRef.current = await openTacticStore(TACTIC_READ_OPTIONS);
    }
    if (storeRef.current) {
      await storeRef.current.delete(id);
    }
    setTactics((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const duplicateTactic = useCallback(
    async (source: Tactic, title: string): Promise<Tactic> => {
      const now = Date.now();
      const duplicated: Tactic = {
        ...source,
        id: generateId('tactic'),
        title,
        createdAt: now,
        updatedAt: now,
        plans: renewedPlans(source),
      };

      await saveTactic(duplicated);
      return duplicated;
    },
    [saveTactic],
  );

  return {
    tactics,
    isLoading,
    reload,
    saveTactic,
    deleteTactic,
    duplicateTactic,
  };
}
