/**
 * A Telegram channel or user link in the one form the app stores: `https://t.me/<handle>`, where the
 * handle follows Telegram's username rule (5-32 letters, digits or underscores, starting with a letter).
 */
export const TELEGRAM_URL_PATTERN = /^https:\/\/t\.me\/[A-Za-z][A-Za-z0-9_]{4,31}$/;

export const MAX_TELEGRAM_URL_LENGTH = 100;

const HANDLE = '[A-Za-z][A-Za-z0-9_]{4,31}';
const TYPED_LINK = new RegExp(
  `^(?:@|(?:https?://)?(?:www\\.)?(?:t|telegram)\\.me/@?)(${HANDLE})/?$`,
);

export function isTelegramUrl(value: string): boolean {
  return value.length <= MAX_TELEGRAM_URL_LENGTH && TELEGRAM_URL_PATTERN.test(value);
}

/**
 * The stored link for what a person typed: `@handle`, `t.me/handle`, `https://t.me/handle` or the
 * `telegram.me` spelling. `null` when it is none of those.
 */
export function parseTelegramLink(input: string): string | null {
  const match = TYPED_LINK.exec(input.trim());
  return match?.[1] === undefined ? null : `https://t.me/${match[1]}`;
}
