/**
 * A Steam Community profile link: `/id/<vanity>` or `/profiles/<17-digit SteamID64>`, with an
 * optional trailing slash. The one rule the page and the Worker both check.
 */
export const STEAM_URL_PATTERN =
  /^https:\/\/steamcommunity\.com\/(?:id\/[A-Za-z0-9_-]{2,32}|profiles\/\d{17})\/?$/;

export const MAX_STEAM_URL_LENGTH = 100;

export function isSteamUrl(value: string): boolean {
  return value.length <= MAX_STEAM_URL_LENGTH && STEAM_URL_PATTERN.test(value);
}
