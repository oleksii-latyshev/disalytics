import {
  isHttpsUrl,
  isLineupCollection,
  isLocalImageRef,
  type Lineup,
  looseLineup,
  normalizeLineup,
  type WorldPoint,
} from '@disa/demo-core';
import { getMapOverview, radarX, radarY } from '@disa/map-data/transform';

export const MAX_TITLE_LENGTH = 120;

/** Side of the square radar image a point has to fall inside, in radar pixels. */
const RADAR_SIZE = 1024;

export const PROBLEM_CODES = [
  'invalid_lineup',
  'wrong_map',
  'title_blank',
  'title_too_long',
  'origin_off_map',
  'landing_off_map',
  'photo_not_https',
] as const;

export type ProblemCode = (typeof PROBLEM_CODES)[number];

/** One reason a lineup cannot be saved; `index` names the photo for `photo_not_https`. */
export interface Problem {
  readonly code: ProblemCode;
  readonly index?: number;
}

/** Whether `point` lies on the map's radar image. A map with no overview cannot say, so it passes. */
export function isOnRadar(map: string, point: WorldPoint): boolean {
  const overview = getMapOverview(map);
  if (overview === undefined) return true;
  const x = radarX(overview, point.x);
  const y = radarY(overview, point.y);
  return x >= 0 && x <= RADAR_SIZE && y >= 0 && y <= RADAR_SIZE;
}

function titleProblems(title: string): Problem[] {
  const length = title.trim().length;
  if (length === 0) return [{ code: 'title_blank' }];
  return length > MAX_TITLE_LENGTH ? [{ code: 'title_too_long' }] : [];
}

function photoProblems(lineup: Lineup): Problem[] {
  const problems: Problem[] = [];
  for (const [index, url] of (lineup.imageUrls ?? []).entries()) {
    if (!isLocalImageRef(url) && !isHttpsUrl(url))
      problems.push({ code: 'photo_not_https', index });
  }
  return problems;
}

/**
 * Everything that stops a lineup from being saved to `map`. The page uses it to guide a fix and the
 * Worker to refuse a body, so the two cannot disagree about what is valid.
 */
export function lineupProblems(value: unknown, map: string): Problem[] {
  const loose = looseLineup(value);
  if (loose === null) return [{ code: 'invalid_lineup' }];
  const lineup = normalizeLineup(loose);

  const problems: Problem[] = [];
  if (lineup.map !== map) problems.push({ code: 'wrong_map' });
  problems.push(...titleProblems(lineup.title));
  if (!isOnRadar(lineup.map, lineup.origin)) problems.push({ code: 'origin_off_map' });
  if (!isOnRadar(lineup.map, lineup.landing)) problems.push({ code: 'landing_off_map' });
  problems.push(...photoProblems(lineup));
  return problems;
}

export const COLLECTION_PROBLEM_CODES = ['invalid_collection', 'wrong_map', 'name_taken'] as const;

export type CollectionProblemCode = (typeof COLLECTION_PROBLEM_CODES)[number];

/**
 * What stops a collection from being saved to `map`, leaving out the one thing only the server
 * knows: whether its name is taken by another collection there (`name_taken`).
 */
export function collectionProblems(value: unknown, map: string): CollectionProblemCode[] {
  if (!isLineupCollection(value)) return ['invalid_collection'];
  return value.map === map ? [] : ['wrong_map'];
}
