import { describe, expect, it } from 'vitest';
import { resolveInitialLocale } from '../helpers/resolve-locale';

describe('resolveInitialLocale', () => {
  it('prefers the persisted locale over the browser languages', () => {
    expect(resolveInitialLocale('ru', ['en-GB', 'en'])).toBe('ru');
  });

  it('ignores a persisted value that is not a supported locale', () => {
    expect(resolveInitialLocale('de', ['ru-RU'])).toBe('ru');
  });

  it('matches a browser language on its base subtag', () => {
    expect(resolveInitialLocale(null, ['ru-RU', 'en-US'])).toBe('ru');
  });

  it('takes the first supported browser language, not the first language', () => {
    expect(resolveInitialLocale(null, ['de-DE', 'en-US', 'ru-RU'])).toBe('en');
  });

  it('falls back to the source locale when nothing matches', () => {
    expect(resolveInitialLocale(null, ['de-DE', 'fr'])).toBe('en');
  });

  it('falls back to the source locale with no browser languages at all', () => {
    expect(resolveInitialLocale(null, [])).toBe('en');
  });
});
