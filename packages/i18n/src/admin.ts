import type { InitialLocale } from './bootstrap';
import type { Locale, MessageTree } from './config';
import { flattenResources } from './helpers/flatten-messages';
import { loadMessages } from './helpers/load-messages';
import { readLocalePreference } from './helpers/locale-storage';
import { resolveLocalePreference } from './helpers/resolve-locale';

const ADMIN_LOADERS: Record<Locale, () => Promise<{ default: MessageTree }>> = {
  en: () => import('./locales/en/admin.json'),
  ru: () => import('./locales/ru/admin.json'),
};

/** The locale as the web app resolves it, with the admin namespace added on top. */
export async function loadAdminLocale(): Promise<InitialLocale> {
  const preference = readLocalePreference();
  const locale = resolveLocalePreference(preference, navigator.languages);
  const [messages, admin] = await Promise.all([loadMessages(locale), ADMIN_LOADERS[locale]()]);
  const adminMessages = flattenResources({ admin: admin.default });
  return { preference, locale, messages: { ...messages, ...adminMessages } };
}
