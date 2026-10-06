import type { CoachNote, ParsedDemo, Tactic } from '@disa/demo-core';
import { openCoachNoteStore, type SavedDemo } from '@disa/demo-store';
import { useEffect, useMemo, useState } from 'react';
import { readSavedDemo } from '@/core/parsing';
import { useSetting } from '@/core/settings';
import { openTactics } from '@/core/tactic-defaults';
import { parseReading, type Reading } from '../helpers/home-reading';
import { lastMatchOf } from '../helpers/home-recent';
import { useSavedDemos } from './use-saved-demos';

export interface HomeData {
  /** `null` until the store has answered, so a first run never flashes a returning reader's home. */
  demos: readonly SavedDemo[] | null;
  reading: Reading | null;
  last: SavedDemo | null;
  /** The last match, decoded, once it has been read out of this device's own storage. */
  lastDemo: ParsedDemo | null;
  /** The reader's own tactics, newest first. */
  tactics: readonly Tactic[];
  /** The coach notes drawn on the last match. */
  notes: readonly CoachNote[];
}

const NONE: readonly never[] = [];

/** Reads a store once and closes it; storage that is absent or refuses is an empty answer. */
function useStoredList<T>(read: () => Promise<readonly T[]>, key: string): readonly T[] {
  const [items, setItems] = useState<readonly T[]>(NONE);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `key` is what names the read; `read` is a fresh closure every render.
  useEffect(() => {
    let isCurrent = true;
    void read()
      .then((list) => {
        if (isCurrent) setItems(list);
      })
      .catch(() => {
        if (isCurrent) setItems(NONE);
      });

    return () => {
      isCurrent = false;
    };
  }, [key]);

  return items;
}

async function tacticsNewestFirst(): Promise<readonly Tactic[]> {
  const store = await openTactics();
  if (store === null) return NONE;

  try {
    return [...(await store.list())].sort((a, b) => b.updatedAt - a.updatedAt);
  } finally {
    store.close();
  }
}

async function notesOf(demoKey: string): Promise<readonly CoachNote[]> {
  const store = await openCoachNoteStore();
  if (store === null) return NONE;

  try {
    return await store.list(demoKey);
  } finally {
    store.close();
  }
}

export function useHomeData(): HomeData {
  const { demos } = useSavedDemos();
  const [storedReading] = useSetting('homeReading');
  const reading = useMemo(() => parseReading(storedReading), [storedReading]);
  const last = useMemo(
    () => (demos === null ? null : lastMatchOf(demos, reading)),
    [demos, reading],
  );
  const lastKey = last?.key ?? '';
  const [loaded, setLoaded] = useState<{ key: string; demo: ParsedDemo } | null>(null);
  const tactics = useStoredList(tacticsNewestFirst, 'tactics');
  const notes = useStoredList(
    () => (lastKey === '' ? Promise.resolve(NONE) : notesOf(lastKey)),
    lastKey,
  );

  useEffect(() => {
    if (lastKey === '') return;

    let isCurrent = true;
    void readSavedDemo(lastKey).then((demo) => {
      if (isCurrent && demo !== null) setLoaded({ key: lastKey, demo });
    });

    return () => {
      isCurrent = false;
    };
  }, [lastKey]);

  return {
    demos,
    reading,
    last,
    lastDemo: loaded !== null && loaded.key === lastKey ? loaded.demo : null,
    tactics,
    notes,
  };
}
