import type { TranslationKey } from './generated/keys';

export const LOCALES = ['en', 'ru'] as const;

export type Locale = (typeof LOCALES)[number];

export const SOURCE_LOCALE: Locale = 'en';

export type Namespace =
  | 'common'
  | 'library'
  | 'controls'
  | 'timeline'
  | 'filters'
  | 'radar'
  | 'settings'
  | 'errors';

export type MessageTree = { readonly [segment: string]: string | MessageTree };

export type LocaleResources = Readonly<Record<Namespace, MessageTree>>;

export type Messages = Readonly<Record<TranslationKey, string>>;

export type TranslationValues = Readonly<Record<string, string | number | boolean | Date>>;

export function isLocale(value: string | null | undefined): value is Locale {
  return LOCALES.some((locale) => locale === value);
}
