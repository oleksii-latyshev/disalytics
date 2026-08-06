import type { ErrorCode } from '@disa/demo-core';
import type { TranslationKey } from '@disa/i18n';

type ErrorCopyStem =
  | 'notADemo'
  | 'truncated'
  | 'unsupportedVersion'
  | 'unsupportedContainer'
  | 'povDemo'
  | 'malformed';

function stemFor(code: ErrorCode): ErrorCopyStem {
  switch (code) {
    case 'NOT_A_DEMO':
      return 'notADemo';
    case 'TRUNCATED_DEMO':
      return 'truncated';
    case 'UNSUPPORTED_DEMO_VERSION':
      return 'unsupportedVersion';
    case 'UNSUPPORTED_CONTAINER':
      return 'unsupportedContainer';
    case 'POV_DEMO_UNSUPPORTED':
      return 'povDemo';
    case 'MALFORMED_DEMO':
      return 'malformed';
  }
}

// Both return TranslationKey rather than the template literal they build, so a code the `errors`
// namespace has no copy for fails to compile here rather than at the screen that renders it.
export function errorTitleKey(code: ErrorCode): TranslationKey {
  return `errors.${stemFor(code)}.title` as const;
}

export function errorHintKey(code: ErrorCode): TranslationKey {
  return `errors.${stemFor(code)}.hint` as const;
}
