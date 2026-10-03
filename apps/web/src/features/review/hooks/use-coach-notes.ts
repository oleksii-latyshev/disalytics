import {
  type CoachNote,
  notedRounds as notedRoundsOf,
  noteForRound,
  withNote,
  withoutNote,
} from '@disa/demo-core';
import { openCoachNoteStore } from '@disa/demo-store';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Transport } from '@/core/playback';
import { type CoachSession, EMPTY_COACH_ANNOTATIONS } from '@/features/radar';

const VOLATILE_PREFIX = 'volatile:';

interface Options {
  demoKey: string;
  coach: CoachSession;
  transport: Transport;
  roundIndex: number | undefined;
  isPlaying: boolean;
}

export interface CoachNotes {
  notedRounds: ReadonlySet<number>;
  hasNote: boolean;
  save: () => void;
  remove: () => void;
}

/**
 * Storage is touched when the match opens and when a note is saved or deleted, never while a frame
 * is drawn. A demo that was not cached has no key worth filing under, so its notes live for the
 * visit only; a store that will not open costs the same.
 */
async function persist(
  demoKey: string,
  write: (store: NonNullable<Awaited<ReturnType<typeof openCoachNoteStore>>>) => Promise<void>,
): Promise<void> {
  if (demoKey.startsWith(VOLATILE_PREFIX)) return;

  try {
    const store = await openCoachNoteStore();
    if (store === null) return;

    try {
      await write(store);
    } finally {
      store.close();
    }
  } catch {
    // the note stays on screen for this visit
  }
}

export function useCoachNotes({
  demoKey,
  coach,
  transport,
  roundIndex,
  isPlaying,
}: Options): CoachNotes {
  const [notes, setNotes] = useState<readonly CoachNote[]>([]);

  useEffect(() => {
    if (demoKey.startsWith(VOLATILE_PREFIX)) return;
    let isCurrent = true;

    void openCoachNoteStore()
      .then(async (store) => {
        if (store === null) return;
        try {
          const stored = await store.list(demoKey);
          // What was saved while this was loading is newer than what was on disk.
          if (isCurrent) setNotes((held) => held.reduce(withNote, stored));
        } finally {
          store.close();
        }
      })
      .catch(() => undefined);

    return () => {
      isCurrent = false;
    };
  }, [demoKey]);

  const current = noteForRound(notes, roundIndex);
  const notedRounds = useMemo(() => notedRoundsOf(notes), [notes]);

  useEffect(() => {
    coach.setNote(isPlaying ? null : current);
  }, [coach, current, isPlaying]);

  const save = useCallback(() => {
    const { history, frame } = coach.getState();
    if (roundIndex === undefined || history.present === EMPTY_COACH_ANNOTATIONS) return;

    const note: CoachNote = {
      roundIndex,
      frame: frame ?? transport.clock.frame,
      annotations: history.present,
    };
    setNotes((held) => withNote(held, note));
    coach.discardDrawings();
    void persist(demoKey, (store) => store.put(demoKey, note));
  }, [coach, demoKey, roundIndex, transport]);

  const remove = useCallback(() => {
    if (roundIndex === undefined) return;

    setNotes((held) => withoutNote(held, roundIndex));
    coach.discardDrawings();
    void persist(demoKey, (store) => store.delete(demoKey, roundIndex));
  }, [coach, demoKey, roundIndex]);

  return { notedRounds, hasNote: current !== null, save, remove };
}
