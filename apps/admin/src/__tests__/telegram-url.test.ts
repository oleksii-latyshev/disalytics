import { describe, expect, it } from 'vitest';
import { isTelegramInputValid, telegramLinkOf } from '../components/TelegramField';

describe('isTelegramInputValid', () => {
  it('lets a blank field through and accepts every spelling of a channel', () => {
    expect(isTelegramInputValid('   ')).toBe(true);
    expect(isTelegramInputValid(' @disa_cs ')).toBe(true);
    expect(isTelegramInputValid('t.me/disa_cs')).toBe(true);
    expect(isTelegramInputValid('https://t.me/disa_cs')).toBe(true);
    expect(isTelegramInputValid('disa_cs')).toBe(false);
    expect(isTelegramInputValid('@abc')).toBe(false);
  });
});

describe('telegramLinkOf', () => {
  it('sends null for blank and the normalised link otherwise', () => {
    expect(telegramLinkOf('  ')).toBeNull();
    expect(telegramLinkOf('@disa_cs')).toBe('https://t.me/disa_cs');
    expect(telegramLinkOf('telegram.me/disa_cs/')).toBe('https://t.me/disa_cs');
    expect(telegramLinkOf('nope')).toBeNull();
  });
});
