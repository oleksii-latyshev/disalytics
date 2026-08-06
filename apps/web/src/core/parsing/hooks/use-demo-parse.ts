import { errorCodeOf, parseDemo } from '@disa/demo-parser';
import { type ActionDispatch, useCallback, useEffect, useReducer, useRef } from 'react';
import { IDLE_PARSE, type ParseEvent, type ParseState, reduceParse } from '../helpers/parse-state';

export interface DemoParse {
  state: ParseState;
  open: (file: File) => void;
  // Abandons whatever is on screen. While a parse is running this is the cancel, and it terminates
  // the worker rather than asking it to stop.
  close: () => void;
}

async function report(
  file: File,
  signal: AbortSignal,
  dispatch: ActionDispatch<[event: ParseEvent]>,
): Promise<void> {
  try {
    const demo = await parseDemo(file, {
      signal,
      onProgress: (phase, percent) => dispatch({ type: 'progressed', phase, percent }),
      onHeader: (header) => dispatch({ type: 'headerRead', header }),
    });

    if (!signal.aborted) dispatch({ type: 'succeeded', demo });
  } catch (thrown) {
    // An abort rejects with its own reason, which is not something to name on an error screen.
    if (signal.aborted) return;
    dispatch({ type: 'failed', code: errorCodeOf(thrown) });
  }
}

export function useDemoParse(): DemoParse {
  const [state, dispatch] = useReducer(reduceParse, IDLE_PARSE);
  const running = useRef<AbortController | null>(null);

  useEffect(() => () => running.current?.abort(), []);

  // Both are memoised because the drop listeners in the library slice take them as effect
  // dependencies, and a fresh identity every render would resubscribe the window every render.
  const open = useCallback((file: File) => {
    running.current?.abort();

    const controller = new AbortController();
    running.current = controller;
    dispatch({ type: 'opened', fileName: file.name });
    void report(file, controller.signal, dispatch);
  }, []);

  const close = useCallback(() => {
    running.current?.abort();
    running.current = null;
    dispatch({ type: 'closed' });
  }, []);

  return { state, open, close };
}
