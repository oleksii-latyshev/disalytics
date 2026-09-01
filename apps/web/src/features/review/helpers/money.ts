/**
 * Money in the reader's own currency rule. The currency is USD because the game's economy is
 * denominated in dollars; what the locale decides is where the symbol sits and how the thousands
 * are grouped, which is `$4,200` in English and `4 200 $` in Russian.
 *
 * Built once per locale rather than per row, the way the clock format is: ten rows at 10 Hz would
 * otherwise construct a formatter a hundred times a second.
 */
export function createMoneyFormat(locale: string): Intl.NumberFormat {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
}

/**
 * The same amount taken apart, because `SlidingNumber` writes digits and nothing else — it accepts a
 * `thousandSeparator` string and has no idea a currency exists, so a figure rolled through it would
 * be `4200` in every locale.
 *
 * What the locale actually decides is three strings: what comes before the digits, what comes after
 * them, and what separates the thousands. `formatToParts` is asked for all three **once per locale**
 * and the digits are then the caller's to animate. That keeps `$4,200` and `4 200 $` correct without
 * either of them being written down here.
 *
 * The probe is 1234567 rather than a round number: it is wide enough to be grouped in every locale
 * this product ships, so the group separator is always one of the parts.
 */
export interface MoneyShape {
  readonly prefix: string;
  readonly suffix: string;
  readonly group: string;
}

export function moneyShape(format: Intl.NumberFormat): MoneyShape {
  const parts = format.formatToParts(1234567);
  const first = parts.findIndex((part) => part.type === 'integer');
  const last = parts.findLastIndex((part) => part.type === 'integer');
  const join = (from: number, to: number): string =>
    parts
      .slice(from, to)
      .map((part) => part.value)
      .join('');

  return {
    prefix: first === -1 ? '' : join(0, first),
    suffix: last === -1 ? '' : join(last + 1, parts.length),
    group: parts.find((part) => part.type === 'group')?.value ?? '',
  };
}
