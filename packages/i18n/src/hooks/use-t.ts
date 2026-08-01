import { useIntl } from 'react-intl';
import type { TranslationValues } from '../config';
import type { TranslationKey } from '../generated/keys';

export type Translate = (path: TranslationKey, values?: TranslationValues) => string;

export function useT(): Translate {
  const intl = useIntl();
  return (path, values) => intl.formatMessage({ id: path }, values);
}
