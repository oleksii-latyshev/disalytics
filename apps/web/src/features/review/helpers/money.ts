/**
 * Money in the reader's own currency rule — `docs/DESIGN.md` §5.3. The currency is USD because the
 * game's economy is denominated in dollars; what the locale decides is where the symbol sits and
 * how the thousands are grouped, which is `$4,200` in English and `4 200 $` in Russian.
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
