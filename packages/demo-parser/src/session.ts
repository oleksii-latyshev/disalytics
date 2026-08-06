import type { MatchHeader, ParsedDemo } from '@disa/demo-core';
import { DemoParseError } from './errors';
import type { DemoSource, ParsePhase, WorkerIn, WorkerOut } from './protocol';

/** The part of `Worker` a parse uses. Narrow enough that a test can drive the protocol directly. */
export interface ParseWorker {
  postMessage(message: WorkerIn): void;
  terminate(): void;
  onmessage: ((event: MessageEvent<WorkerOut>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
}

export interface ParseOptions {
  signal?: AbortSignal;
  onProgress?: (phase: ParsePhase, percent: number) => void;
  onHeader?: (header: MatchHeader) => void;
}

/**
 * Drives one parse to its single outcome and terminates `worker` on every path out.
 *
 * Terminating is not tidiness: it is how the demo leaves linear memory, and an instance that has
 * trapped once cannot be reused anyway (`docs/PARSER.md` §8). A worker never survives a parse.
 */
export function runParse(
  worker: ParseWorker,
  source: DemoSource,
  options: ParseOptions = {},
): Promise<ParsedDemo> {
  const { signal, onProgress, onHeader } = options;

  return new Promise<ParsedDemo>((resolve, reject) => {
    let header: MatchHeader | undefined;
    let abandon: (() => void) | undefined;

    const close = () => {
      worker.onmessage = null;
      worker.onerror = null;
      if (abandon) signal?.removeEventListener('abort', abandon);
      worker.terminate();
    };

    const fail = (reason: unknown) => {
      close();
      reject(reason);
    };

    worker.onmessage = (event) => {
      const message = event.data;

      switch (message.type) {
        case 'progress':
          onProgress?.(message.phase, message.percent);
          return;
        case 'header':
          header = message.header;
          onHeader?.(message.header);
          return;
        case 'error':
          fail(new DemoParseError(message.code));
          return;
        case 'done': {
          if (header === undefined) {
            fail(new Error('the worker reported a parsed demo before its header'));
            return;
          }
          const parsed: ParsedDemo = {
            header,
            track: message.track,
            events: message.events,
          };
          close();
          resolve(parsed);
        }
      }
    };

    worker.onerror = () => {
      fail(new Error('the parse worker stopped before it reported a result'));
    };

    if (signal?.aborted) {
      fail(signal.reason);
      return;
    }

    if (signal) {
      abandon = () => fail(signal.reason);
      signal.addEventListener('abort', abandon, { once: true });
    }

    worker.postMessage({ type: 'parse', source });
  });
}
