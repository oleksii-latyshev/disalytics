import type { LocalePreference } from './resolve-locale';
import { isLocalePreference } from './resolve-locale';

/**
 * The locale is the one preference read before React starts, so this package owns its key rather
 * than the app's settings store — two writers to one key is one writer too many.
 *
 * `system` is stored as the absence of the key: a device whose language changes should follow it,
 * and a reader who never chose has not chosen `en`.
 */
const LOCALE_STORAGE_KEY = 'disa.locale';

export function readLocalePreference(): LocalePreference {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);

    return isLocalePreference(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}

export function storeLocalePreference(preference: LocalePreference): void {
  try {
    if (preference === 'system') {
      localStorage.removeItem(LOCALE_STORAGE_KEY);
      return;
    }

    localStorage.setItem(LOCALE_STORAGE_KEY, preference);
  } catch {
    // The choice still holds for this session; only outliving it needs storage.
  }
}
