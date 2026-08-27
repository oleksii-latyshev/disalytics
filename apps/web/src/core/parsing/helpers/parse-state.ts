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
      /**
       * Whether this tab has been hidden at any point during *this* parse. A backgrounded renderer
       * is confined to efficiency cores and the same demo takes multiples of the time
       * (`docs/PARSER.md` §16), so the screen owes the reader the reason once it has happened.
       */
      wasHidden: boolean;
    }
  | {
      status: 'ready';
      fileName: string;
      demo: ParsedDemo;
      cache: CacheState;
      /**
       * Which round the match opens on. Zero for every route but §10.2's demo dialog, where the
       * reader picked a round out of a list before there was a match to pick it in.
       */
      roundIndex: number;
    }
  | { status: 'failed'; fileName: string; failure: OpenFailure };

export type ParseEvent =
  | { type: 'opened'; fileName: string }
  | { type: 'closed' }
  | { type: 'restored'; demo: ParsedDemo; roundIndex: number }
  | { type: 'parseStarted' }
  | { type: 'progressed'; phase: ParsePhase; percent: number }
  | { type: 'wentHidden' }
  | { type: 'headerRead'; header: MatchHeader }
  | { type: 'succeeded'; demo: ParsedDemo; caching: boolean }
  | { type: 'stored'; persistence: PersistenceStatus }
  | { type: 'notStored' }
  | { type: 'failed'; failure: OpenFailure };

export const IDLE_PARSE: ParseState = { status: 'idle' };

function reduceRestoring(fileName: string, event: ParseEvent): ParseState | null {
  if (event.type === 'restored') {
    return {
      status: 'ready',
      fileName,
      demo: event.demo,
      cache: { status: 'restored' },
      roundIndex: event.roundIndex,
    };
  }

  if (event.type === 'parseStarted') {
    return {
      status: 'parsing',
      fileName,
      phase: 'parse',
      percent: 0,
      header: null,
      wasHidden: false,
    };
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
    // Nothing once it is set: the note is about the run rather than about where the tab is now, and
    // returning the same state is what keeps every later trip to the background off the screen.
    case 'wentHidden':
      return state.wasHidden ? null : { ...state, wasHidden: true };
    case 'headerRead':
      return { ...state, header: event.header };
    case 'succeeded':
      return {
        status: 'ready',
        fileName: state.fileName,
        demo: event.demo,
        cache: { status: event.caching ? 'storing' : 'unavailable' },
        roundIndex: 0,
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
