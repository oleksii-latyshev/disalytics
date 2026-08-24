import type { ParsedDemo } from '@disa/demo-core';
import { errorCodeOf, parseDemo } from '@disa/demo-parser';
import type { SavedDemo } from '@disa/demo-store';
import { type ActionDispatch, useCallback, useEffect, useReducer, useRef } from 'react';
import { type DemoCache, openCacheFor, readSavedDemo } from '../helpers/demo-cache';
import { IDLE_PARSE, type ParseEvent, type ParseState, reduceParse } from '../helpers/parse-state';

export interface DemoParse {
  state: ParseState;
  open: (file: File) => void;
  /**
   * Opens a demo the store already holds, at the round §10.2's dialog was standing on. There is no
   * file and there is nothing to parse.
   */
  openSaved: (saved: SavedDemo, roundIndex: number) => void;
  // Abandons whatever is on screen. While a parse is running this is the cancel, and it terminates
  // the worker rather than asking it to stop.
  close: () => void;
}

type Dispatch = ActionDispatch<[event: ParseEvent]>;

async function keep(
  cache: DemoCache,
  demo: ParsedDemo,
  signal: AbortSignal,
  dispatch: Dispatch,
): Promise<void> {
  try {
    const persistence = await cache.write(demo);

    if (!signal.aborted) dispatch({ type: 'stored', persistence });
  } catch {
    // Storing is the only part of an open that may fail without costing the reader anything: the
    // demo is already on screen, and the next visit pays for the parse again.
    if (!signal.aborted) dispatch({ type: 'notStored' });
  }
}

async function report(file: File, signal: AbortSignal, dispatch: Dispatch): Promise<void> {
  const cache = await openCacheFor(file);
  if (signal.aborted) return;

  const restored = cache === null ? null : await cache.read();
  if (signal.aborted) return;

  if (restored !== null) {
    dispatch({ type: 'restored', demo: restored, roundIndex: 0 });
    return;
  }

  dispatch({ type: 'parseStarted' });

  try {
    const demo = await parseDemo(file, {
      signal,
      onProgress: (phase, percent) => dispatch({ type: 'progressed', phase, percent }),
      onHeader: (header) => dispatch({ type: 'headerRead', header }),
    });

    if (signal.aborted) return;

    dispatch({ type: 'succeeded', demo, caching: cache !== null });
    if (cache !== null) void keep(cache, demo, signal, dispatch);
  } catch (thrown) {
    // An abort rejects with its own reason, which is not something to name on an error screen.
    if (signal.aborted) return;
    dispatch({ type: 'failed', failure: { kind: 'parse', code: errorCodeOf(thrown) } });
  }
}

async function restore(
  key: string,
  roundIndex: number,
  signal: AbortSignal,
  dispatch: Dispatch,
): Promise<void> {
  const demo = await readSavedDemo(key);
  if (signal.aborted) return;

  if (demo === null) {
    dispatch({ type: 'failed', failure: { kind: 'cacheGone' } });
    return;
  }

  dispatch({ type: 'restored', demo, roundIndex });
}

export function useDemoParse(): DemoParse {
  const [state, dispatch] = useReducer(reduceParse, IDLE_PARSE);
  const running = useRef<AbortController | null>(null);

  useEffect(() => () => running.current?.abort(), []);

  // All three are memoised because the drop listeners in the library slice take them as effect
  // dependencies, and a fresh identity every render would resubscribe the window every render.
  const begin = useCallback((fileName: string) => {
    running.current?.abort();

    const controller = new AbortController();
    running.current = controller;
    dispatch({ type: 'opened', fileName });

    return controller.signal;
  }, []);

  const open = useCallback(
    (file: File) => {
      void report(file, begin(file.name), dispatch);
    },
    [begin],
  );

  const openSaved = useCallback(
    (saved: SavedDemo, roundIndex: number) => {
      void restore(saved.key, roundIndex, begin(saved.fileName), dispatch);
    },
    [begin],
  );

  const close = useCallback(() => {
    running.current?.abort();
    running.current = null;
    dispatch({ type: 'closed' });
  }, []);

  return { state, open, openSaved, close };
}
