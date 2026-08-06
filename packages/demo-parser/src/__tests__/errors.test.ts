import { describe, expect, it } from 'vitest';
import { DemoParseError, errorCodeOf } from '../errors';

describe('errorCodeOf', () => {
  it('passes through the identifier the crate threw', () => {
    expect(errorCodeOf(new Error('POV_DEMO_UNSUPPORTED'))).toBe('POV_DEMO_UNSUPPORTED');
  });

  it('collapses a failure the vocabulary has no name for onto the catch-all', () => {
    expect(errorCodeOf(new Error('unreachable'))).toBe('MALFORMED_DEMO');
  });

  it('survives something that is not an Error at all', () => {
    expect(errorCodeOf(undefined)).toBe('MALFORMED_DEMO');
  });
});

describe('DemoParseError', () => {
  it('carries the code as its message, so no prose can reach a screen', () => {
    const error = new DemoParseError('TRUNCATED_DEMO');

    expect(error.code).toBe('TRUNCATED_DEMO');
    expect(error.message).toBe('TRUNCATED_DEMO');
  });
});
