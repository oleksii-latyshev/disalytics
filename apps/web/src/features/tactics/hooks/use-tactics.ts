import { isTactic, parseTacticFile, serializeTacticFile, type Tactic } from '@disa/demo-core';
import { openTacticStore, type TacticStore } from '@disa/demo-store';
import { useCallback, useEffect, useRef, useState } from 'react';
import { generateId } from '../helpers/editor-actions';

function downloadFile(content: string, filename: string, mimeType = 'application/json') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function sanitizeFilename(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'tactic'
  );
}

function parseTacticsFromRaw(raw: unknown): Tactic[] {
  if (Array.isArray(raw)) {
    return raw.filter(isTactic);
  }
  if (typeof raw === 'object' && raw !== null && 'tactics' in raw && Array.isArray(raw.tactics)) {
    return raw.tactics.filter(isTactic);
  }
  if (isTactic(raw)) {
    return [raw];
  }
  return [];
}

export function parseTacticsPayload(text: string): Tactic[] {
  try {
    const parsed = parseTacticFile(text);
    return [...parsed];
  } catch {
    const raw: unknown = JSON.parse(text);
    const parsed = parseTacticsFromRaw(raw);
    if (parsed.length === 0) {
      throw new Error('No valid tactics found in file');
    }
    return parsed;
  }
}

export function useTactics() {
  const [tactics, setTactics] = useState<readonly Tactic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const storeRef = useRef<TacticStore | null>(null);

  const reload = useCallback(async () => {
    try {
      if (!storeRef.current) {
        storeRef.current = await openTacticStore();
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
    openTacticStore().then((store) => {
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
      storeRef.current = await openTacticStore();
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
      storeRef.current = await openTacticStore();
    }
    if (storeRef.current) {
      await storeRef.current.delete(id);
    }
    setTactics((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const duplicateTactic = useCallback(
    async (source: Tactic): Promise<Tactic> => {
      const now = Date.now();
      const duplicated: Tactic = {
        ...source,
        id: generateId('tactic'),
        title: `${source.title} (Copy)`,
        createdAt: now,
        updatedAt: now,
        steps: source.steps.map((step) => ({
          ...step,
          id: generateId('step'),
          throws: step.throws.map((thr) => ({ ...thr, id: generateId('throw') })),
          drawings: (step.drawings ?? []).map((draw) => ({ ...draw, id: generateId('draw') })),
        })),
      };

      await saveTactic(duplicated);
      return duplicated;
    },
    [saveTactic],
  );

  const importTactics = useCallback(
    async (file: File): Promise<number> => {
      const text = await file.text();
      const imported = parseTacticsPayload(text);

      if (!storeRef.current) {
        storeRef.current = await openTacticStore();
      }
      if (storeRef.current) {
        await storeRef.current.putMany(imported);
      }

      await reload();
      return imported.length;
    },
    [reload],
  );

  const exportSingleTactic = useCallback((tactic: Tactic) => {
    const serialized = serializeTacticFile(tactic);
    const filename = `disalytics-tactic-${tactic.map}-${sanitizeFilename(tactic.title)}.json`;
    downloadFile(serialized, filename);
  }, []);

  const exportTactics = useCallback((tacticsToExport: readonly Tactic[]) => {
    const data = JSON.stringify(
      {
        version: 1,
        exportedAt: Date.now(),
        tactics: tacticsToExport,
      },
      null,
      2,
    );
    const filename = `disalytics-tactics-export-${new Date().toISOString().slice(0, 10)}.json`;
    downloadFile(data, filename);
  }, []);

  return {
    tactics,
    isLoading,
    reload,
    saveTactic,
    deleteTactic,
    duplicateTactic,
    importTactics,
    exportSingleTactic,
    exportTactics,
  };
}
