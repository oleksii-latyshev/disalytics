import { useIntl } from 'react-intl';
import { isLocale, type Locale, SOURCE_LOCALE } from '../config';

/** The active locale, for the `Intl` formatters that produce values rather than sentences. */
export function useLocale(): Locale {
  const { locale } = useIntl();

  return isLocale(locale) ? locale : SOURCE_LOCALE;
}
