import type { ParsedDemo } from '@disa/demo-core';
import type { SavedDemo } from '@disa/demo-store';
import { useCallback, useEffect, useRef, useState } from 'react';
import { listSavedDemos, readSavedDemo } from '@/core/parsing';

/**
 * The match the reader is choosing a player from. `ready` is the only state that holds a decoded
 * demo, and it holds it only as long as the picker is open: the picker is unmounted when it closes
 * and the demo goes with it, so what a comparison keeps is the player's points and nothing else.
 */
export type PickedMatch =
  | { readonly status: 'idle' }
  | { readonly status: 'reading'; readonly key: string }
  | { readonly status: 'missing'; readonly key: string }
  | { readonly status: 'ready'; readonly key: string; readonly demo: ParsedDemo };

export interface ComparePicker {
  /** What this device holds, `null` until the store has answered. */
  readonly saved: readonly SavedDemo[] | null;
  readonly picked: PickedMatch;
  readonly choose: (key: string) => void;
  /** Stops waiting for a match being read: the answer is ignored when it comes. */
  readonly cancel: () => void;
}

/**
 * Choosing the match to compare with, from the library — the current one included.
 *
 * **The read is a cache read and never runs in a draw or a scrub**: it starts from a press, shows
 * that it is reading, and can be walked away from. A container that has gone is `missing`, which
 * the dialog turns into "open it once first" — a miss is an answer here, never an error, the way
 * `AGENTS.md` §6.4 has it. An answer that arrives after a cancel, a second choice or the picker
 * closing is thrown away by the token it was started with.
 */
export function useComparePicker(current: { key: string; demo: ParsedDemo }): ComparePicker {
  const [saved, setSaved] = useState<readonly SavedDemo[] | null>(null);
  const [picked, setPicked] = useState<PickedMatch>({ status: 'idle' });
  const token = useRef(0);

  useEffect(() => {
    let isListening = true;

    void listSavedDemos().then((listed) => {
      if (isListening) setSaved(listed);
    });

    return () => {
      isListening = false;
      token.current += 1;
    };
  }, []);

  const choose = useCallback(
    (key: string) => {
      token.current += 1;
      const mine = token.current;

      if (key === current.key) {
        setPicked({ status: 'ready', key, demo: current.demo });
        return;
      }

      setPicked({ status: 'reading', key });

      void readSavedDemo(key).then((demo) => {
        if (token.current !== mine) return;

        setPicked(demo === null ? { status: 'missing', key } : { status: 'ready', key, demo });
      });
    },
    [current.key, current.demo],
  );

  const cancel = useCallback(() => {
    token.current += 1;
    setPicked({ status: 'idle' });
  }, []);

  return { saved, picked, choose, cancel };
}
