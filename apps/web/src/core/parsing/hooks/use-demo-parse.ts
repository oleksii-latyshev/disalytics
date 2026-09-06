import type { ParsedDemo } from '@disa/demo-core';
import { errorCodeOf, parseDemo } from '@disa/demo-parser';
import type { SavedDemo } from '@disa/demo-store';
import { type ActionDispatch, useCallback, useEffect, useReducer, useRef } from 'react';
import { loadSample, type SampleMatch, sampleKey } from '@/core/samples';
import { type DemoCache, openCacheAt, openCacheFor, readSavedDemo } from '../helpers/demo-cache';
import { IDLE_PARSE, type ParseEvent, type ParseState, reduceParse } from '../helpers/parse-state';

export interface DemoParse {
  state: ParseState;
  open: (file: File) => void;
  /**
   * Opens a demo the store already holds, at the round §10.2's dialog was standing on. There is no
   * file and there is nothing to parse.
   */
  openSaved: (saved: SavedDemo, roundIndex: number) => void;
  /**
   * Opens one of the matches this build ships. The bytes are downloaded on this press and never
   * before it, and the second press on the same sample reads them out of the store instead.
   */
  openSample: (sample: SampleMatch) => void;
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

/**
 * Watches for this tab going to the background while a parse is in flight. It belongs to the run
 * and not to the app — a hidden tab costs nothing on any other screen — so the listener is created
 * where the parse is and abandoned with it. Registration reads `document.hidden` on the spot as
 * well: a tab already in the background when the worker starts is just as slow as one that leaves
 * afterwards, and `visibilitychange` will not fire to say so.
 */
function watchVisibility(dispatch: Dispatch): AbortController {
  const watching = new AbortController();
  const record = () => {
    if (document.hidden) dispatch({ type: 'wentHidden' });
  };

  record();
  document.addEventListener('visibilitychange', record, { signal: watching.signal });

  return watching;
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
  const watching = watchVisibility(dispatch);

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
  } finally {
    watching.abort();
  }
}

async function fromSample(
  sample: SampleMatch,
  signal: AbortSignal,
  dispatch: Dispatch,
): Promise<void> {
  const cache = await openCacheAt(sampleKey(sample.id), sample.sourceFile);
  if (signal.aborted) return;

  const stored = cache === null ? null : await cache.read();
  if (signal.aborted) return;

  if (stored !== null) {
    dispatch({ type: 'restored', demo: stored, roundIndex: 0 });
    return;
  }

  dispatch({ type: 'downloading', percent: null });

  try {
    const demo = await loadSample(sample, {
      signal,
      onProgress: (percent) => dispatch({ type: 'downloading', percent }),
    });

    if (signal.aborted) return;

    dispatch({ type: 'succeeded', demo, caching: cache !== null });
    if (cache !== null) void keep(cache, demo, signal, dispatch);
  } catch {
    if (signal.aborted) return;
    // No `ErrorCode` describes a fetch, and none should: nothing was read, and what the reader
    // needs told is that this is the network rather than the match.
    dispatch({ type: 'failed', failure: { kind: 'sampleUnreachable' } });
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

  // Every one of them is memoised because the drop listeners in the library slice take them as
  // effect dependencies, and a fresh identity every render would resubscribe the window every
  // render.
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

  const openSample = useCallback(
    (sample: SampleMatch) => {
      void fromSample(sample, begin(sample.sourceFile), dispatch);
    },
    [begin],
  );

  const close = useCallback(() => {
    running.current?.abort();
    running.current = null;
    dispatch({ type: 'closed' });
  }, []);

  return { state, open, openSaved, openSample, close };
}
