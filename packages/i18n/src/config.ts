import type { ReactNode } from 'react';
import type { TranslationKey } from './generated/keys';

export const LOCALES = ['en', 'ru'] as const;

export type Locale = (typeof LOCALES)[number];

export const SOURCE_LOCALE: Locale = 'en';

export type Namespace =
  | 'common'
  | 'events'
  | 'library'
  | 'review'
  | 'controls'
  | 'timeline'
  | 'filters'
  | 'radar'
  | 'settings'
  | 'help'
  | 'errors';

export type MessageTree = { readonly [segment: string]: string | MessageTree };

export type LocaleResources = Readonly<Record<Namespace, MessageTree>>;

export type Messages = Readonly<Record<TranslationKey, string>>;

export type TranslationValues = Readonly<Record<string, string | number | boolean | Date>>;

/**
 * What a `<Text>` may interpolate. A node is permitted here and nowhere else: a sentence stays one
 * whole ICU message even when one fragment of it has to render differently — a file path carried as
 * game vocabulary, say — and the alternative is concatenating a translated prefix onto it, which
 * `AGENTS.md` §11 rules out. `useT` keeps the narrower type, because an `aria-label` or a
 * `document.title` cannot hold a node.
 */
export type RichTranslationValues = Readonly<
  Record<string, string | number | boolean | Date | ReactNode>
>;

export function isLocale(value: string | null | undefined): value is Locale {
  return LOCALES.some((locale) => locale === value);
}
