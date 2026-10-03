import { isLineup, type Lineup } from '@disa/demo-core';

/** Each map's built-ins load on demand, so a map nobody opens costs no bytes. */
const BUILT_IN_LINEUPS: Readonly<Record<string, () => Promise<{ readonly default: unknown }>>> = {
  de_mirage: () => import('./de_mirage.json'),
};

export async function loadMapLineups(map: string): Promise<readonly Lineup[]> {
  const load = BUILT_IN_LINEUPS[map];
  if (load === undefined) return [];

  const { default: entries } = await load();
  if (!Array.isArray(entries)) return [];

  return entries
    .map((entry: unknown) => (isObjectEntry(entry) ? { ...entry, isBuiltIn: true } : entry))
    .filter(isLineup)
    .filter((lineup) => lineup.map === map);
}

function isObjectEntry(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
