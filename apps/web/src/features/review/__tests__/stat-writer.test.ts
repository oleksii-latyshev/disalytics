import { describe, expect, it } from 'vitest';
import { createStatWriter } from '../helpers/stat-writer';

describe('createStatWriter', () => {
  const write = createStatWriter('en');

  it('writes a missing figure as a dash', () => {
    expect(write(null, 'integer')).toBe('—');
  });

  it('signs a gain and leaves a loss with its own minus', () => {
    expect(write(3, 'signed')).toBe('+3');
    expect(write(0, 'signed')).toBe('0');
    expect(write(-2, 'signed')).toBe('-2');
  });

  it('keeps the decimals a column states', () => {
    expect(write(1.234, 'decimal2')).toBe('1.23');
    expect(write(3, 'decimal1')).toBe('3.0');
    expect(write(74.6, 'percent')).toBe('75 %');
  });

  it('follows the locale', () => {
    expect(createStatWriter('ru')(1.5, 'decimal2')).toBe('1,50');
  });
});
