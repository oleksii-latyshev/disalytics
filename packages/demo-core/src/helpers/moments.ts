import type { ParsedDemo, PlayerSlot, Team } from '../schema';
import { matchClutches } from './clutches';
import { multiKills } from './duels';

export interface Moment {
  readonly roundIndex: number;
  readonly side: Team;
  readonly slot: PlayerSlot;
  readonly kind: 'clutch' | 'multi';
  /** Opponents faced in a clutch, kills made in a multi-kill. */
  readonly count: number;
}

/**
 * The rounds worth jumping to: a clutch against two or more, or three kills in a round. Clutches
 * lead because they decided something; within a kind the bigger one is first, then the earlier.
 */
export function momentsOf(demo: ParsedDemo): readonly Moment[] {
  const moments: Moment[] = [];
  const taken = new Set<string>();

  for (const clutch of matchClutches(demo)) {
    if (clutch.opponents < 2) continue;
    taken.add(`${clutch.roundIndex}:${clutch.player}`);
    moments.push({
      roundIndex: clutch.roundIndex,
      side: clutch.side,
      slot: clutch.player,
      kind: 'clutch',
      count: clutch.opponents,
    });
  }

  for (const multi of multiKills(demo)) {
    if (multi.kills < 3 || taken.has(`${multi.roundIndex}:${multi.player}`)) continue;
    moments.push({
      roundIndex: multi.roundIndex,
      side: multi.side,
      slot: multi.player,
      kind: 'multi',
      count: multi.kills,
    });
  }

  return moments.sort(
    (a, b) =>
      Number(b.kind === 'clutch') - Number(a.kind === 'clutch') ||
      b.count - a.count ||
      a.roundIndex - b.roundIndex,
  );
}
