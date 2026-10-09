const INVITE = /(?:^#|&)invite=([A-Za-z0-9_-]{43})(?:&|$)/;

/** The invite token in a `#invite=…` fragment, or null. A fragment never reaches the server's logs. */
export function inviteTokenOf(hash: string): string | null {
  return INVITE.exec(hash)?.[1] ?? null;
}

export function inviteUrl(origin: string, token: string): string {
  return `${origin}/#invite=${token}`;
}

/** Drops the spent token from the address bar and history. */
export function forgetInvite(): void {
  globalThis.history.replaceState(null, '', globalThis.location.pathname);
}
