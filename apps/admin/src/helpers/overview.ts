import type { OverviewMap } from '@disa/admin-contract';
import { DEFAULT_RADAR_THEME, MAP_IDS, MAP_OVERVIEWS, radarAssetPath } from '@disa/map-data';

export interface MapCard extends OverviewMap {
  /** Nothing of any kind on the site for this map. */
  readonly isEmpty: boolean;
  /** The radar image path, to be resolved against the radar base. */
  readonly image: string;
}

/**
 * Every map the product has a radar for, with its counts: the busiest first, the empty ones last
 * (in radar order), so the map worth opening is never behind one that is bare.
 */
export function mapCards(counted: readonly OverviewMap[]): MapCard[] {
  const byMap = new Map(counted.map((entry) => [entry.map, entry]));
  const cards = MAP_IDS.map((map, index) => {
    const found = byMap.get(map) ?? { map, lineups: 0, collections: 0, tactics: 0 };
    const [level] = MAP_OVERVIEWS[map].levels;
    return {
      index,
      card: {
        ...found,
        isEmpty: found.lineups + found.collections + found.tactics === 0,
        image: radarAssetPath(level, DEFAULT_RADAR_THEME),
      },
    };
  });
  return cards
    .sort(
      (a, b) =>
        Number(a.card.isEmpty) - Number(b.card.isEmpty) ||
        b.card.lineups - a.card.lineups ||
        a.index - b.index,
    )
    .map(({ card }) => card);
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const RELATIVE_DAYS = 14;

/** "3 minutes ago", up to two weeks; a plain date after that. */
export function relativeTime(at: number, now: number, locale: string): string {
  const age = Math.max(0, now - at);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style: 'long' });
  if (age < MINUTE) return rtf.format(0, 'second');
  if (age < HOUR) return rtf.format(-Math.floor(age / MINUTE), 'minute');
  if (age < DAY) return rtf.format(-Math.floor(age / HOUR), 'hour');
  if (age < RELATIVE_DAYS * DAY) return rtf.format(-Math.floor(age / DAY), 'day');
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(at);
}

/** A map's name as a heading: `de_dust2` is Dust II, `de_mirage` is Mirage. Game vocabulary, never translated. */
export function mapTitle(map: string): string {
  const name = map.replace(/^de_/, '').replaceAll('_', ' ');
  return name === 'dust2' ? 'Dust II' : name.charAt(0).toUpperCase() + name.slice(1);
}
