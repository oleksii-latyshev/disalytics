import { describe, expect, it } from 'vitest';
import { ERROR_CODES } from '../errors';

describe('ERROR_CODES', () => {
  it('gives every code a distinct identifier', () => {
    expect(new Set(ERROR_CODES).size).toBe(ERROR_CODES.length);
  });

  it('spells every identifier in SCREAMING_SNAKE_CASE, as the Rust side does', () => {
    for (const code of ERROR_CODES) {
      expect(code).toMatch(/^[A-Z][A-Z_]*$/);
    }
  });
});
