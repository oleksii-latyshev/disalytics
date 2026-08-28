import { createElement, type ElementType } from 'react';
import { useIntl } from 'react-intl';
import type { RichTranslationValues } from '../config';
import type { TranslationKey } from '../generated/keys';

interface Props {
  path: TranslationKey;
  as?: ElementType;
  values?: RichTranslationValues;
}

export function Text({ path, as = 'span', values }: Props) {
  const intl = useIntl();
  return createElement(as, null, intl.formatMessage({ id: path }, values));
}
