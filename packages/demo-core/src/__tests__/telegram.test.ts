import { describe, expect, it } from 'vitest';
import { isTelegramUrl, parseTelegramLink } from '../helpers/telegram';

describe('parseTelegramLink', () => {
  it('normalises every spelling of a handle to https://t.me/<handle>', () => {
    for (const input of [
      '@disa_cs',
      't.me/disa_cs',
      'https://t.me/disa_cs',
      'http://t.me/disa_cs/',
      'https://www.t.me/disa_cs',
      'telegram.me/disa_cs',
      'https://telegram.me/@disa_cs',
      '  https://t.me/disa_cs  ',
    ]) {
      expect(parseTelegramLink(input)).toBe('https://t.me/disa_cs');
    }
  });

  it('refuses short, odd or foreign handles and other hosts', () => {
    for (const input of [
      '',
      'disa_cs',
      '@abcd',
      '@1abcde',
      '@_abcde',
      '@abc-def',
      `@${'a'.repeat(33)}`,
      'https://t.me/',
      'https://t.me/joinchat/AAAA',
      'https://t.me/disa_cs/12',
      'https://t.me/disa_cs?x=1',
      'https://example.com/disa_cs',
      'https://t.me.evil.com/disa_cs',
      'https://steamcommunity.com/id/alex',
    ]) {
      expect(parseTelegramLink(input)).toBeNull();
    }
  });

  it('keeps the case of the handle and accepts the longest one', () => {
    expect(parseTelegramLink('@DisaCS')).toBe('https://t.me/DisaCS');
    expect(parseTelegramLink(`@a${'b'.repeat(31)}`)).toBe(`https://t.me/a${'b'.repeat(31)}`);
  });
});

describe('isTelegramUrl', () => {
  it('takes only the normalised form', () => {
    expect(isTelegramUrl('https://t.me/disa_cs')).toBe(true);
    for (const value of [
      '@disa_cs',
      't.me/disa_cs',
      'https://t.me/disa_cs/',
      'http://t.me/disa_cs',
      'https://t.me/ab',
    ]) {
      expect(isTelegramUrl(value)).toBe(false);
    }
  });
});
