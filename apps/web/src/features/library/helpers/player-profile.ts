import { foldPlayerLines, type PlayerMatchLine } from '@disa/demo-core';
import type { SavedDemo } from '@disa/demo-store';

export interface ProfileMatch {
  readonly demo: SavedDemo;
  readonly line: PlayerMatchLine;
}

export interface ProfileMoment {
  readonly demoKey: string;
  readonly map: string;
  readonly roundIndex: number;
  readonly kind: 'clutch' | 'multi';
  readonly count: number;
}

/** The maps the player has a match on, most played first and the name breaking a tie. */
export function mapsOf(matches: readonly ProfileMatch[]): readonly string[] {
  const counts = new Map<string, number>();
  for (const { line } of matches) counts.set(line.map, (counts.get(line.map) ?? 0) + 1);

  return [...counts]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'en'))
    .map(([map]) => map);
}

/** `null` is every map. */
export function onMap(
  matches: readonly ProfileMatch[],
  map: string | null,
): readonly ProfileMatch[] {
  return map === null ? matches : matches.filter(({ line }) => line.map === map);
}

/** Damage per round on each map, in `mapsOf`' order. */
export function adrByMap(
  matches: readonly ProfileMatch[],
): readonly { map: string; adr: number }[] {
  return mapsOf(matches).map((map) => ({
    map,
    adr: foldPlayerLines(onMap(matches, map).map(({ line }) => line)).adr,
  }));
}

const MOMENTS_SHOWN = 8;

/**
 * The rounds worth jumping to: clutches against two or more, then rounds of three kills or more,
 * the bigger first and the earlier match first within a size. A clutch round that was also a
 * three-kill round is named once, as the clutch.
 */
export function momentsAcross(matches: readonly ProfileMatch[]): readonly ProfileMoment[] {
  const moments: ProfileMoment[] = [];

  for (const { demo, line } of matches) {
    const clutched = new Set<number>();

    for (const clutch of line.clutches) {
      if (clutch.count < 2) continue;
      clutched.add(clutch.roundIndex);
      moments.push({ demoKey: demo.key, map: line.map, ...clutch, kind: 'clutch' });
    }

    for (const multi of line.multiKills) {
      if (clutched.has(multi.roundIndex)) continue;
      moments.push({ demoKey: demo.key, map: line.map, ...multi, kind: 'multi' });
    }
  }

  return moments
    .sort((a, b) => Number(b.kind === 'clutch') - Number(a.kind === 'clutch') || b.count - a.count)
    .slice(0, MOMENTS_SHOWN);
}
