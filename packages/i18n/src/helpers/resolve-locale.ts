import { isLocale, type Locale, SOURCE_LOCALE } from '../config';

export function resolveInitialLocale(
  storedLocale: string | null,
  preferredLanguages: readonly string[],
): Locale {
  if (isLocale(storedLocale)) return storedLocale;

  for (const languageTag of preferredLanguages) {
    const base = languageTag.split('-')[0]?.toLowerCase();
    if (isLocale(base)) return base;
  }

  return SOURCE_LOCALE;
}
