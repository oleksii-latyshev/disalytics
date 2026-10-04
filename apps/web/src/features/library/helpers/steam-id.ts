export type SteamIdEntry =
  | { kind: 'ok'; steamId: string }
  | { kind: 'format' }
  | { kind: 'vanity' };

// Every SteamID64 is 17 digits and starts 7656. Accounts made after the 7656119… range filled up
// begin 765612…, so pinning the fifth to seventh digits would turn a real id into "not valid".
const STEAM_ID64 = /(?:profiles\/)?(?<![\d])(7656\d{13})(?!\d)/;

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
