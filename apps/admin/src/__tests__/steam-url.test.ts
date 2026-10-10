import { isSteamUrl } from '@disa/admin-contract';
import { describe, expect, it } from 'vitest';
import { isSteamInputValid } from '../components/SteamField';

describe('isSteamUrl', () => {
  it('takes a vanity or a SteamID64 profile, with or without a trailing slash', () => {
    expect(isSteamUrl('https://steamcommunity.com/id/alex_cs')).toBe(true);
    expect(isSteamUrl('https://steamcommunity.com/id/alex-cs/')).toBe(true);
    expect(isSteamUrl('https://steamcommunity.com/profiles/76561198000000000')).toBe(true);
    expect(isSteamUrl('https://steamcommunity.com/profiles/76561198000000000/')).toBe(true);
  });

  it('refuses everything else', () => {
    for (const value of [
      'http://steamcommunity.com/id/alex',
      'https://example.com/id/alex',
      'https://steamcommunity.com.evil.com/id/alex',
      'https://steamcommunity.com/id/a',
      'https://steamcommunity.com/id/alex/extra',
      'https://steamcommunity.com/profiles/123',
      'https://steamcommunity.com/id/alex?x=1',
      'https://steamcommunity.com/id/al ex',
      'steamcommunity.com/id/alex',
      '',
    ]) {
      expect(isSteamUrl(value)).toBe(false);
    }
  });
});

describe('isSteamInputValid', () => {
  it('lets a blank field through and trims before checking', () => {
    expect(isSteamInputValid('   ')).toBe(true);
    expect(isSteamInputValid(' https://steamcommunity.com/id/alex ')).toBe(true);
    expect(isSteamInputValid('alex')).toBe(false);
  });
});
