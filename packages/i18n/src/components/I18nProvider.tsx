import { type ReactNode, useEffect } from 'react';
import { type IntlConfig, IntlProvider } from 'react-intl';
import { type Locale, type Messages, SOURCE_LOCALE } from '../config';

interface Props {
  locale: Locale;
  messages: Messages;
  children: ReactNode;
}

const handleError: NonNullable<IntlConfig['onError']> = (error) => {
  if (import.meta.env.DEV) throw error;
  console.error(error);
};

export function I18nProvider({ locale, messages, children }: Props) {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <IntlProvider
      locale={locale}
      defaultLocale={SOURCE_LOCALE}
      messages={messages}
      onError={handleError}
    >
      {children}
    </IntlProvider>
  );
}
