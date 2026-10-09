const MAPS = [
  'de_ancient',
  'de_anubis',
  'de_dust2',
  'de_inferno',
  'de_mirage',
  'de_nuke',
  'de_overpass',
  'de_train',
  'de_vertigo',
] as const;

export const DEFAULT_MAP = 'de_mirage';

/** Known maps plus any the opened file holds, without repeats. */
export function mapOptions(extra: readonly string[]): string[] {
  return [...new Set([...MAPS, ...extra])].sort();
}
