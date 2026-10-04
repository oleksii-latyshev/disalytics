export type SteamIdEntry =
  | { kind: 'ok'; steamId: string }
  | { kind: 'format' }
  | { kind: 'vanity' };

const STEAM_ID64 = /(?:profiles\/)?(7656119\d{10})(?!\d)/;

/**
 * A SteamID64 out of what a reader pasted: the number itself, or a `/profiles/<number>` link. A
 * short `/id/<name>` link is a vanity name that needs Steam to resolve it — #524 — so it is named as
 * that rather than reported as malformed.
 */
export function parseSteamId(raw: string): SteamIdEntry {
  const trimmed = raw.trim();
  const direct = STEAM_ID64.exec(trimmed);
  if (direct?.[1] !== undefined) return { kind: 'ok', steamId: direct[1] };

  return /steamcommunity\.com\/id\//i.test(trimmed) ? { kind: 'vanity' } : { kind: 'format' };
}
