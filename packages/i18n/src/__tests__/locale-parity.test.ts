import { describe, expect, it } from 'vitest';
import { flattenResources } from '../helpers/flatten-messages';
import en from '../locales/en';
import ru from '../locales/ru';

const source = flattenResources(en);
const target = flattenResources(ru);

const RUSSIAN_PLURAL_FORMS = ['one', 'few', 'many', 'other'] as const;
const PLURAL_ARGUMENT = /\{\s*\w+\s*,\s*plural\s*,/;

function hasForm(message: string, form: string): boolean {
  return new RegExp(`(^|[\\s}])${form}\\s*\\{`).test(message);
}

function pluralisedKeys(messages: Record<string, string>): string[] {
  return Object.entries(messages)
    .filter(([, message]) => PLURAL_ARGUMENT.test(message))
    .map(([key]) => key);
}

describe('locale parity', () => {
  it('defines the same keys in en and ru', () => {
    expect(Object.keys(target).sort()).toEqual(Object.keys(source).sort());
  });

  it('ships at least one pluralised key', () => {
    expect(pluralisedKeys(source).length).toBeGreaterThan(0);
  });

  it.each(RUSSIAN_PLURAL_FORMS)('gives every pluralised ru key a %s form', (form) => {
    for (const key of pluralisedKeys(source)) {
      expect(hasForm(target[key] ?? '', form), `${key} is missing the ${form} form`).toBe(true);
    }
  });
});
