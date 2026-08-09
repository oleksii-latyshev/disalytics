/** Two digits, no grouping — the shape `mm:ss` needs, in the reader's own locale. */
export function createClockFormat(locale: string): Intl.NumberFormat {
  return new Intl.NumberFormat(locale, { minimumIntegerDigits: 2, useGrouping: false });
}

/** `mm:ss`, counting past 60 minutes rather than growing an hours field a match rarely needs. */
export function formatClock(format: Intl.NumberFormat, seconds: number): string {
  const whole = seconds > 0 ? Math.floor(seconds) : 0;

  return `${format.format(Math.floor(whole / 60))}:${format.format(whole % 60)}`;
}

/** One formatted value rather than a translated sentence with numbers in it. */
export function formatElapsedOfTotal(
  format: Intl.NumberFormat,
  seconds: number,
  totalSeconds: number,
): string {
  return `${formatClock(format, seconds)} / ${formatClock(format, totalSeconds)}`;
}
