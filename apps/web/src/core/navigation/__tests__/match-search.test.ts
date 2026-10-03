import { describe, expect, it } from 'vitest';
import { clampMatchRound, receiveTransportRound, receiveUrlRound, validateMatchSearch } from '..';

describe('match route search', () => {
  it('defaults malformed query values to the first round and stage', () => {
    expect(validateMatchSearch({ round: '4', view: 'unknown' })).toEqual({
      round: 1,
      view: 'stage',
    });
    expect(validateMatchSearch({ round: -2, view: null })).toEqual({
      round: 1,
      view: 'stage',
    });
  });

  it('accepts valid round and view values', () => {
    expect(validateMatchSearch({ round: 5, view: 'duels' })).toEqual({
      round: 5,
      view: 'duels',
    });
  });

  it('opens Stats on the players tab unless another is named', () => {
    expect(validateMatchSearch({ view: 'stats' })).toEqual({
      round: 1,
      view: 'stats',
      tab: 'players',
    });
    expect(validateMatchSearch({ view: 'stats', tab: 'rounds' })).toEqual({
      round: 1,
      view: 'stats',
      tab: 'rounds',
    });
    expect(validateMatchSearch({ view: 'stats', tab: 'nope' })).toMatchObject({ tab: 'players' });
  });

  it('keeps the tab out of the other views', () => {
    expect(validateMatchSearch({ view: 'duels', tab: 'rounds' })).toEqual({
      round: 1,
      view: 'duels',
    });
  });

  it('sends the retired scoreboard and metrics views to their tabs', () => {
    expect(validateMatchSearch({ round: 3, view: 'scoreboard' })).toEqual({
      round: 3,
      view: 'stats',
      tab: 'players',
    });
    expect(validateMatchSearch({ round: 3, view: 'metrics' })).toEqual({
      round: 3,
      view: 'stats',
      tab: 'rounds',
    });
  });

  it('bounds rounds to the match', () => {
    expect(clampMatchRound(5, 3)).toBe(3);
    expect(clampMatchRound(0, 3)).toBe(1);
    expect(clampMatchRound(2, 0)).toBe(1);
  });

  it('seeks on URL history changes without writing the stale readout back', () => {
    const external = receiveUrlRound(
      { urlRound: 5, pendingUrlWrites: [], pendingSeekRound: null },
      4,
      5,
    );
    expect(external.seekRound).toBe(4);
    expect(receiveTransportRound(external.state, 5)).toEqual({
      state: { urlRound: 4, pendingUrlWrites: [], pendingSeekRound: 4 },
      writeRound: null,
    });
    expect(receiveTransportRound(external.state, 4)).toEqual({
      state: { urlRound: 4, pendingUrlWrites: [], pendingSeekRound: null },
      writeRound: null,
    });
  });

  it('replaces the URL for playback round changes without seeking back', () => {
    const playback = receiveTransportRound(
      { urlRound: 5, pendingUrlWrites: [], pendingSeekRound: null },
      6,
    );
    expect(playback).toEqual({
      state: { urlRound: 6, pendingUrlWrites: [6], pendingSeekRound: null },
      writeRound: 6,
    });
    expect(receiveUrlRound(playback.state, 6, 6)).toEqual({
      state: { urlRound: 6, pendingUrlWrites: [], pendingSeekRound: null },
      seekRound: null,
    });
  });

  it('ignores an older playback URL write after transport has crossed again', () => {
    const first = receiveTransportRound(
      { urlRound: 5, pendingUrlWrites: [], pendingSeekRound: null },
      6,
    );
    const second = receiveTransportRound(first.state, 7);
    const firstUrl = receiveUrlRound(second.state, 6, 7);

    expect(second.writeRound).toBe(7);
    expect(firstUrl.seekRound).toBeNull();
    expect(firstUrl.state).toEqual({
      urlRound: 7,
      pendingUrlWrites: [7],
      pendingSeekRound: null,
    });
  });
});
