import { ERROR_CODES, type ErrorCode } from '@disa/demo-core';

/**
 * The parse failed for a reason the UI can name. `message` is the code itself: the worker emits no
 * prose, and the translated copy lives in the `errors` i18n namespace.
 */
export class DemoParseError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode) {
    super(code);
    this.name = 'DemoParseError';
    this.code = code;
  }
}

function isErrorCode(value: string): value is ErrorCode {
  return ERROR_CODES.some((code) => code === value);
}

/**
 * The code inside whatever the WASM boundary threw. `wasm-bindgen` turns the crate's `JsError` into
 * an `Error` whose message is the identifier, so anything else is a failure of the worker rather
 * than of the demo, and collapses onto the catch-all until the vocabulary grows one of its own.
 */
export function errorCodeOf(thrown: unknown): ErrorCode {
  const message = thrown instanceof Error ? thrown.message : String(thrown);

  return isErrorCode(message) ? message : 'MALFORMED_DEMO';
}
