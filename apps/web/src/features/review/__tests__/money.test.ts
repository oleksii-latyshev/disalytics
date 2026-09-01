import { describe, expect, it } from 'vitest';
import { createMoneyFormat, moneyShape } from '../helpers/money';

describe('moneyShape', () => {
  it('puts the symbol where English puts it', () => {
    const shape = moneyShape(createMoneyFormat('en'));

    expect(shape.prefix).toBe('$');
    expect(shape.suffix).toBe('');
    expect(shape.group).toBe(',');
  });

  it('puts the symbol where Russian puts it, separator and all', () => {
    const shape = moneyShape(createMoneyFormat('ru'));

    expect(shape.prefix).toBe('');
    // A trailing symbol, and the space in front of it is the locale's rather than a literal one.
    expect(shape.suffix.endsWith('$')).toBe(true);
    expect(shape.suffix.length).toBeGreaterThan(1);
    expect(shape.group.trim()).toBe('');
  });

  it('rebuilds what the formatter itself would print', () => {
    for (const locale of ['en', 'ru']) {
      const format = createMoneyFormat(locale);
      const shape = moneyShape(format);

      for (const value of [0, 100, 4200, 16000]) {
        const digits = new Intl.NumberFormat(locale, { useGrouping: true }).format(value);
        // The group separator a plain decimal format uses is the one the currency format uses,
        // which is what lets `SlidingNumber` be handed a single string for it.
        expect(shape.prefix + digits.split(/[^0-9]/).join(shape.group) + shape.suffix).toBe(
          format.format(value),
        );
      }
    }
  });
});
