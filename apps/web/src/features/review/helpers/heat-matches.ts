import type { SavedDemo } from '@disa/demo-store';
import { SAMPLE_MATCHES, sampleKey } from '@/core/samples';

/** One saved match as the comparison's picker lists it. */
export interface MatchRow {
  readonly key: string;
  readonly map: string;
  /** The names of the two teams, for a shipped sample; the catalog keeps none for a demo of the reader's own. */
  readonly teams: readonly [string, string] | null;
  readonly fileName: string;
  /** `startedCt : startedT`, the way the library states a score. */
  readonly score: string;
  /** A match can only be compared with one on the same map: the field is a place. */
  readonly isSameMap: boolean;
}

function rowOf(demo: SavedDemo, map: string): MatchRow {
  const sample = SAMPLE_MATCHES.find((each) => sampleKey(each.id) === demo.key);

  return {
    key: demo.key,
    map: demo.map,
    teams: sample?.teams ?? null,
    fileName: demo.fileName,
    score: `${demo.score.startedCt} : ${demo.score.startedT}`,
    isSameMap: demo.map === map,
  };
}

/**
 * What the picker offers besides the match on screen, which it always lists first and by itself:
 * every other saved match, those on the same map first and the rest after them with their reason.
 * Each group keeps the catalog's own order, most recently used first.
 */
export function matchRows(
  saved: readonly SavedDemo[],
  current: { readonly key: string; readonly map: string },
): readonly MatchRow[] {
  const rows = saved
    .filter((demo) => demo.key !== current.key)
    .map((demo) => rowOf(demo, current.map));

  return [...rows.filter((row) => row.isSameMap), ...rows.filter((row) => !row.isSameMap)];
}
