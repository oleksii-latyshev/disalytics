import { isLocale, type Locale, SOURCE_LOCALE } from '../config';

/** The reader's answer to `docs/DESIGN.md` §10.5's language row: a locale, or whatever the device says. */
export type LocalePreference = 'system' | Locale;

export function isLocalePreference(value: string | null | undefined): value is LocalePreference {
  return value === 'system' || isLocale(value);
}

/** The first supported locale the device asks for, or the source locale. */
export function systemLocale(preferredLanguages: readonly string[]): Locale {
  for (const languageTag of preferredLanguages) {
    const base = languageTag.split('-')[0]?.toLowerCase();
    if (isLocale(base)) return base;
  }

  return SOURCE_LOCALE;
}

export function resolveLocalePreference(
  preference: LocalePreference,
  preferredLanguages: readonly string[],
): Locale {
  return preference === 'system' ? systemLocale(preferredLanguages) : preference;
}

export function resolveInitialLocale(
  storedLocale: string | null,
  preferredLanguages: readonly string[],
): Locale {
  return isLocale(storedLocale) ? storedLocale : systemLocale(preferredLanguages);
}
