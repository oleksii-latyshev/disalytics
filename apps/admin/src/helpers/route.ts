import { mapOptions } from './format';

/** The places of the admin, in the order the navigation lists them. */
export const SECTIONS = [
  'overview',
  'import',
  'onSite',
  'tactics',
  'people',
  'contributors',
  'history',
] as const;
export type Section = (typeof SECTIONS)[number];

export interface Route {
  readonly section: Section;
  /** The map open under Lineups on the site, when the address names one. */
  readonly map?: string | undefined;
  /** The Tactics section was opened to start a new tactic. */
  readonly isNewTactic?: boolean | undefined;
}

export const HOME: Route = { section: 'overview' };

const PATHS: Readonly<Record<Section, string>> = {
  overview: '',
  import: 'lineups/add',
  onSite: 'lineups/site',
  tactics: 'tactics',
  people: 'people',
  contributors: 'contributors',
  history: 'history',
};

/**
 * The route a `location.hash` names. Anything that is not a route (an empty hash, `#invite=…`, a
 * path nobody knows) is the overview, so a stale link lands somewhere sensible.
 */
export function parseRoute(hash: string): Route {
  if (!hash.startsWith('#/')) return HOME;
  const [first = '', second = '', third = ''] = hash.slice(2).split('/');
  const path = `${first}/${second}`;
  if (path === PATHS.import) return { section: 'import' };
  if (path === PATHS.onSite) {
    const map = decodeURIComponent(third);
    return mapOptions([]).includes(map) ? { section: 'onSite', map } : { section: 'onSite' };
  }
  if (first === PATHS.tactics) {
    return second === 'new' ? { section: 'tactics', isNewTactic: true } : { section: 'tactics' };
  }
  const section = SECTIONS.find((entry) => entry !== 'overview' && PATHS[entry] === first);
  return section === undefined || second !== '' ? HOME : { section };
}

/** The hash for a route; the overview is the bare `#/`. */
export function formatRoute(route: Route): string {
  const base = `#/${PATHS[route.section]}`;
  if (route.section === 'onSite' && route.map !== undefined) return `${base}/${route.map}`;
  if (route.section === 'tactics' && route.isNewTactic === true) return `${base}/new`;
  return base;
}
