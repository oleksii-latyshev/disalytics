import type { MatchHeader, ParsedDemo } from '@disa/demo-core';
import { newEvents, newTrack } from '@disa/demo-core/test-helpers';
import { describe, expect, it } from 'vitest';
import { IDLE_PARSE, type ParseState, reduceParse } from '../helpers/parse-state';

const header: MatchHeader = { map: 'de_mirage', tickRate: 64, players: [] };
const demo: ParsedDemo = { header, track: newTrack(), events: newEvents() };

function opened(fileName = 'match.dem'): ParseState {
  return reduceParse(IDLE_PARSE, { type: 'opened', fileName });
}

describe('reduceParse', () => {
  it('starts at nought percent with no header yet', () => {
    expect(opened()).toEqual({
      status: 'parsing',
      fileName: 'match.dem',
      phase: 'parse',
      percent: 0,
      header: null,
    });
  });

  it('keeps the file name across every outcome', () => {
    const parsing = opened('faceit-1-2-3.dem');

    expect(reduceParse(parsing, { type: 'succeeded', demo })).toMatchObject({
      status: 'ready',
      fileName: 'faceit-1-2-3.dem',
    });
    expect(reduceParse(parsing, { type: 'failed', code: 'NOT_A_DEMO' })).toMatchObject({
      status: 'failed',
      fileName: 'faceit-1-2-3.dem',
    });
  });

  it('records the header while the last pass is still running', () => {
    const withHeader = reduceParse(opened(), { type: 'headerRead', header });

    expect(withHeader).toMatchObject({ status: 'parsing', header });
  });

  it('follows the phase the worker reports', () => {
    const advanced = reduceParse(opened(), {
      type: 'progressed',
      phase: 'decompress',
      percent: 33,
    });

    expect(advanced).toMatchObject({ status: 'parsing', phase: 'decompress', percent: 33 });
  });

  it('returns to idle when the reader closes the demo', () => {
    const ready = reduceParse(opened(), { type: 'succeeded', demo });

    expect(reduceParse(ready, { type: 'closed' })).toEqual(IDLE_PARSE);
    expect(reduceParse(opened(), { type: 'closed' })).toEqual(IDLE_PARSE);
  });

  it('ignores a terminated worker’s last messages', () => {
    for (const event of [
      { type: 'progressed', phase: 'parse', percent: 100 },
      { type: 'headerRead', header },
      { type: 'succeeded', demo },
      { type: 'failed', code: 'MALFORMED_DEMO' },
    ] as const) {
      expect(reduceParse(IDLE_PARSE, event)).toBe(IDLE_PARSE);
    }
  });

  it('does not let a late message reopen a demo that was already read', () => {
    const ready = reduceParse(opened(), { type: 'succeeded', demo });

    expect(reduceParse(ready, { type: 'progressed', phase: 'parse', percent: 67 })).toBe(ready);
    expect(reduceParse(ready, { type: 'failed', code: 'TRUNCATED_DEMO' })).toBe(ready);
  });

  it('replaces the whole state when a second demo is opened mid-parse', () => {
    const first = reduceParse(opened('first.dem'), {
      type: 'progressed',
      phase: 'parse',
      percent: 67,
    });

    expect(reduceParse(first, { type: 'opened', fileName: 'second.dem' })).toEqual({
      status: 'parsing',
      fileName: 'second.dem',
      phase: 'parse',
      percent: 0,
      header: null,
    });
  });
});
