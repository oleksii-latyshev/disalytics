import type { ErrorCode, MatchHeader, ParsedDemo } from '@disa/demo-core';
import type { ParsePhase } from '@disa/demo-parser';

export type ParseState =
  | { status: 'idle' }
  | {
      status: 'parsing';
      fileName: string;
      phase: ParsePhase;
      percent: number;
      header: MatchHeader | null;
    }
  | { status: 'ready'; fileName: string; demo: ParsedDemo }
  | { status: 'failed'; fileName: string; code: ErrorCode };

export type ParseEvent =
  | { type: 'opened'; fileName: string }
  | { type: 'closed' }
  | { type: 'progressed'; phase: ParsePhase; percent: number }
  | { type: 'headerRead'; header: MatchHeader }
  | { type: 'succeeded'; demo: ParsedDemo }
  | { type: 'failed'; code: ErrorCode };

export const IDLE_PARSE: ParseState = { status: 'idle' };

// `opened` and `closed` are the reader's; every other event belongs to a parse already running.
// That distinction is what keeps a worker's last messages from redrawing a screen the reader has
// left — the worker is terminated rather than asked to stop, so a message posted just before the
// terminate can still be waiting in the queue.
export function reduceParse(state: ParseState, event: ParseEvent): ParseState {
  if (event.type === 'opened') {
    return {
      status: 'parsing',
      fileName: event.fileName,
      phase: 'parse',
      percent: 0,
      header: null,
    };
  }

  if (event.type === 'closed') return IDLE_PARSE;

  if (state.status !== 'parsing') return state;

  switch (event.type) {
    case 'progressed':
      return { ...state, phase: event.phase, percent: event.percent };
    case 'headerRead':
      return { ...state, header: event.header };
    case 'succeeded':
      return { status: 'ready', fileName: state.fileName, demo: event.demo };
    case 'failed':
      return { status: 'failed', fileName: state.fileName, code: event.code };
  }
}
