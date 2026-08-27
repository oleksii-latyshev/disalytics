import { createIntl } from 'react-intl';
import { describe, expect, it } from 'vitest';
import { loadMessages } from '../helpers/load-messages';

const ru = createIntl({ locale: 'ru', messages: await loadMessages('ru') });
const en = createIntl({ locale: 'en', messages: await loadMessages('en') });

describe('russian plural selection', () => {
  it.each([
    [1, '1 раунд'],
    [21, '21 раунд'],
    [2, '2 раунда'],
    [23, '23 раунда'],
    [5, '5 раундов'],
    [11, '11 раундов'],
    [0, '0 раундов'],
  ])('renders %i with the form the locale requires', (count, expected) => {
    expect(ru.formatMessage({ id: 'library.saved.rounds' }, { count })).toBe(expected);
  });
});

describe('english plural selection', () => {
  it.each([
    [1, '1 round'],
    [2, '2 rounds'],
    [0, '0 rounds'],
  ])('renders %i with the form the locale requires', (count, expected) => {
    expect(en.formatMessage({ id: 'library.saved.rounds' }, { count })).toBe(expected);
  });
});
