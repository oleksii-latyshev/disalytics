import { createIntl } from 'react-intl';
import { describe, expect, it } from 'vitest';
import { loadMessages } from '../helpers/load-messages';

const ru = createIntl({ locale: 'ru', messages: await loadMessages('ru') });
const en = createIntl({ locale: 'en', messages: await loadMessages('en') });

describe('russian plural selection', () => {
  it.each([
    [1, 'Остался 1 раунд'],
    [21, 'Остался 21 раунд'],
    [2, 'Осталось 2 раунда'],
    [23, 'Осталось 23 раунда'],
    [5, 'Осталось 5 раундов'],
    [11, 'Осталось 11 раундов'],
    [0, 'Осталось 0 раундов'],
  ])('renders %i with the form the locale requires', (count, expected) => {
    expect(ru.formatMessage({ id: 'timeline.roundsRemaining' }, { count })).toBe(expected);
  });
});

describe('english plural selection', () => {
  it.each([
    [1, '1 round left'],
    [2, '2 rounds left'],
    [0, '0 rounds left'],
  ])('renders %i with the form the locale requires', (count, expected) => {
    expect(en.formatMessage({ id: 'timeline.roundsRemaining' }, { count })).toBe(expected);
  });
});
