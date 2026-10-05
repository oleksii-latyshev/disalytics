import type { UtilityKind } from '@disa/demo-core';

/**
 * What a lineup's kind is called in play: the short names a player says ("smoke Xbox"), which are
 * game vocabulary and so never translated (`AGENTS.md` §11). `UTILITY_NAMES` carries the full item
 * names, which are too long for a list row.
 */
export const LINEUP_KIND_NAMES: Readonly<Record<UtilityKind, string>> = {
  smoke: 'Smoke',
  flash: 'Flash',
  fire: 'Molotov',
  he: 'HE',
  decoy: 'Decoy',
  kit: 'Defuse Kit',
};

/** The order players say them in, which is the order a row of kind chips is in. */
export const LINEUP_KIND_ORDER: readonly UtilityKind[] = ['smoke', 'flash', 'fire', 'he', 'decoy'];
