import type { ErrorCode, MatchEvents, MatchHeader, TickTrack } from '@disa/demo-core';

/**
 * A handle is accepted alongside a `File` so a PWA file-handler launch reaches the worker without
 * a copy — `AGENTS.md` §12.
 */
export type DemoSource = File | FileSystemFileHandle;

/** Decompression is the container's half of the work and arrives with the `.zst`/`.bz2` decoders. */
export type ParsePhase = 'decompress' | 'parse';

export type WorkerOut =
  | { type: 'progress'; phase: ParsePhase; percent: number }
  | { type: 'header'; header: MatchHeader }
  | { type: 'done'; track: TickTrack; events: MatchEvents }
  | { type: 'error'; code: ErrorCode };

/**
 * Cancellation has no message. `docs/PARSER.md` §8 found that an instance which has trapped once
 * throws on every later call, so an aborted parse cannot hand its worker back — and terminating it
 * is also the only thing that frees the demo out of linear memory.
 */
export type WorkerIn = { type: 'parse'; source: DemoSource };
