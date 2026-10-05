import type { PlayerColumnFormat } from './player-table';

export type StatWriter = (value: number | null, format: PlayerColumnFormat) => string;

/** `+3` reads as a gain where `3` reads as a count, and the minus is the character's own. */
function signed(value: number, integer: Intl.NumberFormat): string {
  return value > 0 ? `+${integer.format(value)}` : integer.format(value);
}

/** Writes a figure the way its column states it, in the reader's locale; a missing one is a dash. */
export function createStatWriter(locale: string): StatWriter {
  const integer = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const decimal1 = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  const decimal2 = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (value, format) => {
    if (value === null) return '—';

    switch (format) {
      case 'signed':
        return signed(value, integer);
      case 'percent':
        return `${integer.format(value)} %`;
      case 'decimal1':
        return decimal1.format(value);
      case 'decimal2':
        return decimal2.format(value);
      case 'integer':
        return integer.format(value);
    }
  };
}
