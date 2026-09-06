/**
 * The matches this build ships so a reader with no demo of their own can still see what the product
 * does — `ROADMAP.md` M7, and the decision it owed: a public professional match rather than ten
 * private people, published by HLTV, with two of the series' three maps because every regeneration
 * after a `SCHEMA_VERSION` bump lands in the repository's history again.
 *
 * What is committed is the **parse** of a demo and never a demo: `AGENTS.md`'s constraints table
 * forbids a `.dem` in the tree outright, and a container is what the store already reads. The bytes
 * are rebuilt by `bun run samples:generate` from `.dem` files that stay on the owner's machine, and
 * `bun run samples:check` is what stops a stale one shipping.
 *
 * This module holds no import on purpose — `tools/scripts` reads it as well as the app, and the
 * `?url` half of a sample lives beside it in `assets.ts` for exactly that reason.
 */
/**
 * The ids, as their own list, so `SAMPLE_ASSETS` can be a `Record` over them: a sample nobody
 * shipped bytes for is then a compile error rather than a card that answers a press with a failure.
 */
export const SAMPLE_IDS = ['navi-vitality-inferno', 'navi-vitality-dust2'] as const;

export type SampleId = (typeof SAMPLE_IDS)[number];

export interface SampleMatch {
  /** Both the asset's base name and the cache key's own, so a sample is traceable in either place. */
  id: SampleId;
  /** The `.dem` the container was built from. Never committed; named so a rebuild is reproducible. */
  sourceFile: string;
  /** Game vocabulary — the map as the demo writes it, never translated. */
  map: string;
  /** Proper nouns, and game vocabulary for the same reason a map name is. */
  teams: readonly [string, string];
  event: string;
}

export const SAMPLE_MATCHES: readonly SampleMatch[] = [
  {
    id: 'navi-vitality-inferno',
    sourceFile: 'natus-vincere-vs-vitality-m3-inferno.dem',
    map: 'de_inferno',
    teams: ['Natus Vincere', 'Vitality'],
    event: 'IEM Atlanta 2026',
  },
  {
    id: 'navi-vitality-dust2',
    sourceFile: 'natus-vincere-vs-vitality-m1-dust2.dem',
    map: 'de_dust2',
    teams: ['Natus Vincere', 'Vitality'],
    event: 'IEM Atlanta 2026',
  },
];
