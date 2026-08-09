import { describe, expect, it } from 'vitest';
import { createClockFormat, formatElapsedOfTotal } from '../helpers/elapsed';

const en = createClockFormat('en');

describe('formatElapsedOfTotal', () => {
  it('pads both fields to two digits', () => {
    expect(formatElapsedOfTotal(en, 65, 2467)).toBe('01:05 / 41:07');
  });

  it('counts minutes past the hour rather than growing a field', () => {
    expect(formatElapsedOfTotal(en, 3665, 3665)).toBe('61:05 / 61:05');
  });

  it('drops the part of a second', () => {
    expect(formatElapsedOfTotal(en, 9.99, 10)).toBe('00:09 / 00:10');
  });

  it('reads a match that has not started as zero', () => {
    expect(formatElapsedOfTotal(en, 0, 0)).toBe('00:00 / 00:00');
  });
});
