import { useContext } from 'react';
import { type LocaleControl, LocaleControlContext } from '../components/I18nProvider';

/** The language row in `docs/DESIGN.md` §10.5: what the reader chose, and how they change it. */
export function useLocalePreference(): LocaleControl {
  const control = useContext(LocaleControlContext);

  if (control === null) {
    throw new Error('useLocalePreference must be used inside an I18nProvider');
  }

  return control;
}
