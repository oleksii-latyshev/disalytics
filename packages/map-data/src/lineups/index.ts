import type { Lineup } from '@disa/demo-core';

export const BUILT_IN_LINEUP_MAPS = [
  'de_ancient',
  'de_anubis',
  'de_dust2',
  'de_inferno',
  'de_mirage',
  'de_nuke',
] as const;

export type BuiltInLineupMap = (typeof BUILT_IN_LINEUP_MAPS)[number];

export function hasBuiltInLineups(map: string): map is BuiltInLineupMap {
  return (BUILT_IN_LINEUP_MAPS as readonly string[]).includes(map);
}

/** Lazily loads built-in grenade lineups for the given map. */
export async function loadMapLineups(map: string): Promise<readonly Lineup[]> {
  switch (map) {
    case 'de_ancient': {
      const { ANCIENT_LINEUPS } = await import('./de_ancient');
      return ANCIENT_LINEUPS;
    }
    case 'de_anubis': {
      const { ANUBIS_LINEUPS } = await import('./de_anubis');
      return ANUBIS_LINEUPS;
    }
    case 'de_dust2': {
      const { DUST2_LINEUPS } = await import('./de_dust2');
      return DUST2_LINEUPS;
    }
    case 'de_inferno': {
      const { INFERNO_LINEUPS } = await import('./de_inferno');
      return INFERNO_LINEUPS;
    }
    case 'de_mirage': {
      const { MIRAGE_LINEUPS } = await import('./de_mirage');
      return MIRAGE_LINEUPS;
    }
    case 'de_nuke': {
      const { NUKE_LINEUPS } = await import('./de_nuke');
      return NUKE_LINEUPS;
    }
    default:
      return [];
  }
}
