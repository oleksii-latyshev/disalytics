import { type Locale, type LocaleResources, type Messages, SOURCE_LOCALE } from '../config';
import { TRANSLATION_KEYS } from '../generated/keys';
import { flattenResources } from './flatten-messages';

// One dynamic import per locale, so the bundler emits one chunk per locale and only the active one
// is fetched. The JS budget in AGENTS.md §16 is measured against a single locale.
const LOADERS: Record<Locale, () => Promise<{ default: LocaleResources }>> = {
  en: () => import('../locales/en'),
  ru: () => import('../locales/ru'),
};

async function importResources(locale: Locale): Promise<Record<string, string>> {
  const { default: resources } = await LOADERS[locale]();
  return flattenResources(resources);
}

function missingKeys(messages: Record<string, string>): string[] {
  return TRANSLATION_KEYS.filter((key) => messages[key] === undefined);
}

function assertComplete(
  locale: Locale,
  messages: Record<string, string>,
): asserts messages is Messages {
  const missing = missingKeys(messages);
  if (missing.length > 0) {
    throw new Error(`Locale "${locale}" has no message for: ${missing.join(', ')}`);
  }
}

export async function loadMessages(locale: Locale): Promise<Messages> {
  const messages = await importResources(locale);
  const missing = missingKeys(messages);

  if (missing.length > 0 && !import.meta.env.DEV && locale !== SOURCE_LOCALE) {
    const source = await importResources(SOURCE_LOCALE);
    for (const key of missing) {
      const fallback = source[key];
      if (fallback !== undefined) messages[key] = fallback;
    }
  }

  assertComplete(locale, messages);
  return messages;
}
