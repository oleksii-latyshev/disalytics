import { describe, expect, it } from 'vitest';
import { parseSteamId } from '../helpers/steam-id';

describe('parseSteamId', () => {
  it('takes a bare SteamID64, trimmed', () => {
    expect(parseSteamId('  76561198012345678\n')).toEqual({
      kind: 'ok',
      steamId: '76561198012345678',
    });
  });

  it('takes ids past the 7656119 range', () => {
    expect(parseSteamId('76561200012345678')).toEqual({ kind: 'ok', steamId: '76561200012345678' });
  });

  it('takes the number out of a profiles link', () => {
    expect(parseSteamId('https://steamcommunity.com/profiles/76561198012345678/')).toEqual({
      kind: 'ok',
      steamId: '76561198012345678',
    });
  });

  it('names a vanity link as such', () => {
    expect(parseSteamId('https://steamcommunity.com/id/someone')).toEqual({ kind: 'vanity' });
  });

  it.each(['', '123', '7656119801234567', '765611980123456789', 'abc'])(
    'rejects %j as a format miss',
    (raw) => {
      expect(parseSteamId(raw)).toEqual({ kind: 'format' });
    },
  );
});
