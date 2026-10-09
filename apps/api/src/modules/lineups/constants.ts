/** Matches the ids `@disa/map-data` ships, without pulling that package's images and nav grids in. */
export const MAP_ID = /^de_[a-z0-9_]{1,40}$/;

export const LINEUPS_CACHE_CONTROL = 'public, max-age=60, stale-while-revalidate=600';
