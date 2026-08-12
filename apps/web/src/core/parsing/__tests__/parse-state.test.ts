import type { MatchHeader, ParsedDemo } from '@disa/demo-core';
import { newEvents, newTrack } from '@disa/demo-core/test-helpers';
import { describe, expect, it } from 'vitest';
import { IDLE_PARSE, type ParseState, reduceParse } from '../helpers/parse-state';

const header: MatchHeader = { map: 'de_mirage', tickRate: 64, players: [], weapons: [] };
const demo: ParsedDemo = { header, track: newTrack(), events: newEvents() };

function opened(fileName = 'match.dem'): ParseState {
  return reduceParse(IDLE_PARSE, { type: 'opened', fileName });
}

function parsing(fileName = 'match.dem'): ParseState {
  return reduceParse(opened(fileName), { type: 'parseStarted' });
}

function ready(fileName = 'match.dem'): ParseState {
  return reduceParse(parsing(fileName), { type: 'succeeded', demo, caching: true });
}

describe('reduceParse', () => {
  it('looks in the cache before it reads anything', () => {
    expect(opened()).toEqual({ status: 'restoring', fileName: 'match.dem' });
  });

  it('starts at nought percent with no header yet', () => {
    expect(parsing()).toEqual({
      status: 'parsing',
      fileName: 'match.dem',
      phase: 'parse',
      percent: 0,
      header: null,
    });
  });

  it('skips the parse entirely when the cache had the demo', () => {
    expect(reduceParse(opened(), { type: 'restored', demo })).toEqual({
      status: 'ready',
      fileName: 'match.dem',
      demo,
      cache: { status: 'restored' },
    });
  });

  it('keeps the file name across every outcome', () => {
    const started = parsing('faceit-1-2-3.dem');

    expect(reduceParse(started, { type: 'succeeded', demo, caching: true })).toMatchObject({
      status: 'ready',
      fileName: 'faceit-1-2-3.dem',
    });
    expect(reduceParse(started, { type: 'failed', code: 'NOT_A_DEMO' })).toMatchObject({
      status: 'failed',
      fileName: 'faceit-1-2-3.dem',
    });
  });

  it('records the header while the last pass is still running', () => {
    const withHeader = reduceParse(parsing(), { type: 'headerRead', header });

    expect(withHeader).toMatchObject({ status: 'parsing', header });
  });

  it('follows the phase the worker reports', () => {
    const advanced = reduceParse(parsing(), {
      type: 'progressed',
      phase: 'decompress',
      percent: 33,
    });

    expect(advanced).toMatchObject({ status: 'parsing', phase: 'decompress', percent: 33 });
  });

  it('says the demo is on its way to the cache before it arrives', () => {
    expect(ready()).toMatchObject({ cache: { status: 'storing' } });
    expect(reduceParse(parsing(), { type: 'succeeded', demo, caching: false })).toMatchObject({
      cache: { status: 'unavailable' },
    });
  });

  it('records what the browser said about keeping the cache', () => {
    const stored = reduceParse(ready(), { type: 'stored', persistence: 'best-effort' });

    expect(stored).toMatchObject({ cache: { status: 'stored', persistence: 'best-effort' } });
    expect(reduceParse(ready(), { type: 'notStored' })).toMatchObject({
      cache: { status: 'unavailable' },
    });
  });

  it('returns to idle when the reader closes the demo', () => {
    expect(reduceParse(ready(), { type: 'closed' })).toEqual(IDLE_PARSE);
    expect(reduceParse(parsing(), { type: 'closed' })).toEqual(IDLE_PARSE);
    expect(reduceParse(opened(), { type: 'closed' })).toEqual(IDLE_PARSE);
  });

  it('ignores a terminated worker’s last messages', () => {
    for (const event of [
      { type: 'progressed', phase: 'parse', percent: 100 },
      { type: 'headerRead', header },
      { type: 'succeeded', demo, caching: true },
      { type: 'failed', code: 'MALFORMED_DEMO' },
    ] as const) {
      expect(reduceParse(IDLE_PARSE, event)).toBe(IDLE_PARSE);
    }
  });

  it('does not let a late message reopen a demo that was already read', () => {
    const done = ready();

    expect(reduceParse(done, { type: 'progressed', phase: 'parse', percent: 67 })).toBe(done);
    expect(reduceParse(done, { type: 'failed', code: 'TRUNCATED_DEMO' })).toBe(done);
    expect(reduceParse(done, { type: 'restored', demo })).toBe(done);
  });

  it('does not let a cache answer arrive before the demo does', () => {
    const started = parsing();

    expect(reduceParse(started, { type: 'stored', persistence: 'persisted' })).toBe(started);
    expect(reduceParse(started, { type: 'notStored' })).toBe(started);
  });

  it('replaces the whole state when a second demo is opened mid-parse', () => {
    const first = reduceParse(parsing('first.dem'), {
      type: 'progressed',
      phase: 'parse',
      percent: 67,
    });

    expect(reduceParse(first, { type: 'opened', fileName: 'second.dem' })).toEqual({
      status: 'restoring',
      fileName: 'second.dem',
    });
  });
});
