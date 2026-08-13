import type { ErrorCode, MatchHeader, ParsedDemo } from '@disa/demo-core';
import type { ParsePhase } from '@disa/demo-parser';
import type { PersistenceStatus } from '@disa/demo-store';

/** What became of the cache for the demo on screen, which is what the reader is told about it. */
export type CacheState =
  | { status: 'restored' }
  | { status: 'storing' }
  | { status: 'stored'; persistence: PersistenceStatus }
  | { status: 'unavailable' };

/**
 * Why an open ended without a demo on screen. A saved demo that is no longer on the device is not
 * a parser failure and has no `ErrorCode`: nothing was read, and the vocabulary in
 * `packages/demo-core` describes what a demo turned out to be.
 */
export type OpenFailure = { kind: 'parse'; code: ErrorCode } | { kind: 'cacheGone' };

export type ParseState =
  | { status: 'idle' }
  | { status: 'restoring'; fileName: string }
  | {
      status: 'parsing';
      fileName: string;
      phase: ParsePhase;
      percent: number;
      header: MatchHeader | null;
    }
  | { status: 'ready'; fileName: string; demo: ParsedDemo; cache: CacheState }
  | { status: 'failed'; fileName: string; failure: OpenFailure };

export type ParseEvent =
  | { type: 'opened'; fileName: string }
  | { type: 'closed' }
  | { type: 'restored'; demo: ParsedDemo }
  | { type: 'parseStarted' }
  | { type: 'progressed'; phase: ParsePhase; percent: number }
  | { type: 'headerRead'; header: MatchHeader }
  | { type: 'succeeded'; demo: ParsedDemo; caching: boolean }
  | { type: 'stored'; persistence: PersistenceStatus }
  | { type: 'notStored' }
  | { type: 'failed'; failure: OpenFailure };

export const IDLE_PARSE: ParseState = { status: 'idle' };

function reduceRestoring(fileName: string, event: ParseEvent): ParseState | null {
  if (event.type === 'restored') {
    return { status: 'ready', fileName, demo: event.demo, cache: { status: 'restored' } };
  }

  if (event.type === 'parseStarted') {
    return { status: 'parsing', fileName, phase: 'parse', percent: 0, header: null };
  }

  // Only a demo opened from the list can fail here: a file falls through to a parse instead, and a
  // saved demo has nothing left to fall through to once its entry has gone.
  if (event.type === 'failed') {
    return { status: 'failed', fileName, failure: event.failure };
  }

  return null;
}

function reduceParsing(
  state: Extract<ParseState, { status: 'parsing' }>,
  event: ParseEvent,
): ParseState | null {
  switch (event.type) {
    case 'progressed':
      return { ...state, phase: event.phase, percent: event.percent };
    case 'headerRead':
      return { ...state, header: event.header };
    case 'succeeded':
      return {
        status: 'ready',
        fileName: state.fileName,
        demo: event.demo,
        cache: { status: event.caching ? 'storing' : 'unavailable' },
      };
    case 'failed':
      return { status: 'failed', fileName: state.fileName, failure: event.failure };
    default:
      return null;
  }
}

function reduceReady(
  state: Extract<ParseState, { status: 'ready' }>,
  event: ParseEvent,
): ParseState | null {
  if (event.type === 'stored') {
    return { ...state, cache: { status: 'stored', persistence: event.persistence } };
  }

  if (event.type === 'notStored') return { ...state, cache: { status: 'unavailable' } };

  return null;
}

// `opened` and `closed` are the reader's; every other event belongs to an open already under way.
// That distinction is what keeps a worker's last messages from redrawing a screen the reader has
// left — the worker is terminated rather than asked to stop, so a message posted just before the
// terminate can still be waiting in the queue.
export function reduceParse(state: ParseState, event: ParseEvent): ParseState {
  if (event.type === 'opened') return { status: 'restoring', fileName: event.fileName };
  if (event.type === 'closed') return IDLE_PARSE;

  switch (state.status) {
    case 'restoring':
      return reduceRestoring(state.fileName, event) ?? state;
    case 'parsing':
      return reduceParsing(state, event) ?? state;
    case 'ready':
      return reduceReady(state, event) ?? state;
    default:
      return state;
  }
}
