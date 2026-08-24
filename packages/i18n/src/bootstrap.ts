import type { Locale, Messages } from './config';
import { loadMessages } from './helpers/load-messages';
import { readLocalePreference } from './helpers/locale-storage';
import { type LocalePreference, resolveLocalePreference } from './helpers/resolve-locale';

export interface InitialLocale {
  preference: LocalePreference;
  locale: Locale;
  messages: Messages;
}

export async function loadInitialLocale(): Promise<InitialLocale> {
  const preference = readLocalePreference();
  const locale = resolveLocalePreference(preference, navigator.languages);

  return { preference, locale, messages: await loadMessages(locale) };
}
