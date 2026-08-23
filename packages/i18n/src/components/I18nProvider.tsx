import {
  createContext,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { type IntlConfig, IntlProvider } from 'react-intl';
import type { InitialLocale } from '../bootstrap';
import { SOURCE_LOCALE } from '../config';
import { loadMessages } from '../helpers/load-messages';
import { storeLocalePreference } from '../helpers/locale-storage';
import { type LocalePreference, resolveLocalePreference } from '../helpers/resolve-locale';

interface Props {
  initial: InitialLocale;
  children: ReactNode;
}

export interface LocaleControl {
  readonly preference: LocalePreference;
  choose(preference: LocalePreference): void;
}

export const LocaleControlContext = createContext<LocaleControl | null>(null);

const handleError: NonNullable<IntlConfig['onError']> = (error) => {
  if (import.meta.env.DEV) throw error;
  console.error(error);
};

/**
 * The locale, and the one place it changes. Messages are a chunk per locale, so switching is
 * asynchronous — the screen keeps the locale it has until the new one has arrived rather than
 * rendering a screen of message ids.
 */
export function I18nProvider({ initial, children }: Props) {
  const [state, setState] = useState(initial);

  // Which switch is the current one. A reader who presses twice before the first chunk lands must
  // end on the second choice, not on whichever request happened to resolve last.
  const requestRef = useRef(0);

  useEffect(() => {
    document.documentElement.lang = state.locale;
  }, [state.locale]);

  const choose = useCallback((preference: LocalePreference) => {
    const locale = resolveLocalePreference(preference, navigator.languages);
    const request = requestRef.current + 1;
    requestRef.current = request;

    storeLocalePreference(preference);
    setState((current) => ({ ...current, preference }));

    void loadMessages(locale).then((messages) => {
      if (requestRef.current !== request) return;

      setState((current) => ({ preference: current.preference, locale, messages }));
    });
  }, []);

  const control = useMemo<LocaleControl>(
    () => ({ preference: state.preference, choose }),
    [state.preference, choose],
  );

  return (
    <LocaleControlContext value={control}>
      <IntlProvider
        locale={state.locale}
        defaultLocale={SOURCE_LOCALE}
        messages={state.messages}
        onError={handleError}
      >
        {children}
      </IntlProvider>
    </LocaleControlContext>
  );
}
