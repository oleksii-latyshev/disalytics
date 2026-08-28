import { describe, expect, it } from 'vitest';
import { matchHistoryFolder } from '../helpers/match-history';

const USER_AGENT = {
  windows:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  macos:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  linux: 'Mozilla/5.0 (X11; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0',
  android:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
  iphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  chromeOs:
    'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
} as const;

describe('match history folder', () => {
  it('names a folder for each desktop the browser reports by client hint', () => {
    expect(matchHistoryFolder({ platform: 'Windows' })).toContain('\\Steam\\steamapps\\');
    expect(matchHistoryFolder({ platform: 'macOS' })).toContain('~/Library/Application Support/');
    expect(matchHistoryFolder({ platform: 'Linux' })).toContain('~/.steam/steam/');
  });

  it('reads the user agent only when the client hint is absent or empty', () => {
    expect(matchHistoryFolder({ userAgent: USER_AGENT.windows })).toContain('\\Steam\\');
    expect(matchHistoryFolder({ userAgent: USER_AGENT.macos })).toContain('~/Library/');
    expect(matchHistoryFolder({ userAgent: USER_AGENT.linux })).toContain('~/.steam/');

    expect(matchHistoryFolder({ platform: '  ', userAgent: USER_AGENT.linux })).toContain(
      '~/.steam/',
    );
  });

  it('takes the client hint over the user agent, rather than joining the two', () => {
    expect(matchHistoryFolder({ platform: 'Windows', userAgent: USER_AGENT.linux })).toContain(
      '\\Steam\\',
    );
  });

  it('names no folder where the platform has none', () => {
    expect(matchHistoryFolder({ platform: 'Android' })).toBeNull();
    expect(matchHistoryFolder({ platform: 'Chrome OS' })).toBeNull();
    expect(matchHistoryFolder({ platform: 'Unknown' })).toBeNull();

    expect(matchHistoryFolder({ userAgent: USER_AGENT.android })).toBeNull();
    expect(matchHistoryFolder({ userAgent: USER_AGENT.iphone })).toBeNull();
    expect(matchHistoryFolder({ userAgent: USER_AGENT.chromeOs })).toBeNull();
  });

  it('does not take an iPad asking for the desktop site for a Mac', () => {
    expect(matchHistoryFolder({ userAgent: USER_AGENT.macos, maxTouchPoints: 5 })).toBeNull();
    expect(matchHistoryFolder({ userAgent: USER_AGENT.macos, maxTouchPoints: 0 })).toContain(
      '~/Library/',
    );
  });

  it('names no folder when the platform reports nothing at all', () => {
    expect(matchHistoryFolder({})).toBeNull();
    expect(matchHistoryFolder({ platform: '', userAgent: '' })).toBeNull();
  });

  it('gives every folder a distinct path that ends at the replay directory', () => {
    const folders = (['Windows', 'macOS', 'Linux'] as const).map((platform) =>
      matchHistoryFolder({ platform }),
    );

    expect(new Set(folders).size).toBe(folders.length);
    for (const folder of folders) expect(folder).toMatch(/replays$/);
  });
});
