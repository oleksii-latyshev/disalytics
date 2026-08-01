import type { Locale, Messages } from './config';
import { loadMessages } from './helpers/load-messages';
import { resolveInitialLocale } from './helpers/resolve-locale';

const LOCALE_STORAGE_KEY = 'disa.locale';

export interface InitialLocale {
  locale: Locale;
  messages: Messages;
}

export async function loadInitialLocale(): Promise<InitialLocale> {
  const locale = resolveInitialLocale(
    localStorage.getItem(LOCALE_STORAGE_KEY),
    navigator.languages,
  );

  return { locale, messages: await loadMessages(locale) };
}
