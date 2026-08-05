/**
 * The parser's error vocabulary, one identifier per variant of `ErrorCode` in
 * `crates/demo-parser/src/error.rs`. `bun run errors:check` fails when the two drift apart, and
 * renaming one is a change to the worker protocol rather than a rename.
 *
 * These are machine-readable codes. The translated copy lives in the `errors` i18n namespace, and
 * the parser never produces prose.
 */
export const ERROR_CODES = [
  'NOT_A_DEMO',
  'TRUNCATED_DEMO',
  'UNSUPPORTED_DEMO_VERSION',
  'UNSUPPORTED_CONTAINER',
  'POV_DEMO_UNSUPPORTED',
  /**
   * The file is a Source 2 demo and could not be read anyway. Upstream distinguishes three dozen
   * ways that happens and a reader can act on none of them, so they arrive as one code.
   */
  'MALFORMED_DEMO',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];
