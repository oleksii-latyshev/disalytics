import { ERROR_CODES } from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import { errorHintKey, errorTitleKey } from '../helpers/error-copy';

describe('error copy', () => {
  it('gives every parser error its own screen', () => {
    const titles = ERROR_CODES.map(errorTitleKey);

    expect(new Set(titles).size).toBe(ERROR_CODES.length);
  });

  it('says what happened and what to do from the same stem', () => {
    for (const code of ERROR_CODES) {
      expect(errorHintKey(code)).toBe(errorTitleKey(code).replace(/\.title$/, '.hint'));
    }
  });

  it('reads copy out of the errors namespace, which the parser never writes into', () => {
    for (const code of ERROR_CODES) {
      expect(errorTitleKey(code)).toMatch(/^errors\.\w+\.title$/);
    }
  });
});
