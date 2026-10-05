import type { Kill, ParsedDemo, PlayerSlot } from '../schema';
import { type Duel, isOpponentDuel, matchDuels, type OpponentDuel } from './duels';
import { type OpeningSide, openingSideBySlot } from './score';
import { killWeaponName } from './weapons';

/** One thing and how many times it happened, as every "who most" line of a reading is. */
export interface Counted<T> {
  readonly value: T;
  readonly count: number;
}

/**
 * Counts what `keyOf` names, most first. Ties keep the order the values were first seen in, which
 * is the match's own order, so the same demo always reads the same way.
 */
function countBy<T>(duels: readonly Duel[], keyOf: (duel: Duel) => T): readonly Counted<T>[] {
  const counts = new Map<T, number>();
  for (const duel of duels) {
    const key = keyOf(duel);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count);
}

/** Every kill in the match whose two ends are opponents — a teamkill or a suicide is not a duel. */
export function opponentDuels(demo: ParsedDemo): readonly OpponentDuel[] {
  return matchDuels(demo).filter(isOpponentDuel);
}

/**
 * Who killed whom, as a square of counts: `killed(a, v)` is how many times `a` killed `v` in the
 * duels given. A typed array rather than a map of maps, which is §6.2's rule, and derived once per
 * mode rather than per cell.
 */
export interface HeadToHead {
  killed(attacker: PlayerSlot, victim: PlayerSlot): number;
}

export function headToHead(duels: readonly Duel[], slotCount: number): HeadToHead {
  const counts = new Uint16Array(slotCount * slotCount);
  for (const duel of duels) {
    const index = duel.attacker * slotCount + duel.victim;
    counts[index] = (counts[index] ?? 0) + 1;
  }

  return { killed: (attacker, victim) => counts[attacker * slotCount + victim] ?? 0 };
}

export interface PlayerDuels {
  readonly kills: number;
  readonly deaths: number;
  readonly killsAsCt: number;
  readonly killsAsT: number;
  /** Victims, most killed first. */
  readonly killed: readonly Counted<PlayerSlot>[];
  /** Attackers, the one who killed this player most first. */
  readonly diedTo: readonly Counted<PlayerSlot>[];
}

/** What one player did across the duels given. */
export function playerDuels(duels: readonly Duel[], slot: PlayerSlot): PlayerDuels {
  const made = duels.filter((duel) => duel.attacker === slot);
  const lost = duels.filter((duel) => duel.victim === slot);

  return {
    kills: made.length,
    deaths: lost.length,
    killsAsCt: made.filter((duel) => duel.attackerSide === 'CT').length,
    killsAsT: made.filter((duel) => duel.attackerSide === 'T').length,
    killed: countBy(made, (duel) => duel.victim),
    diedTo: countBy(lost, (duel) => duel.attacker),
  };
}

/**
 * The weapons the duels given were won with, most used first. The name is the display one, read
 * through `ENTRY_BY_INTERNAL_NAME` by `killWeaponName` (#53).
 */
export function duelWeapons(
  duels: readonly Duel[],
  kills: readonly Kill[],
): readonly Counted<string>[] {
  const weaponOf = (duel: Duel) => {
    const kill = kills[duel.killIndex];

    return kill === undefined ? '' : killWeaponName(kill.weapon);
  };

  return countBy(duels, weaponOf).filter(({ value }) => value !== '');
}

export interface OpeningReading {
  /** The openings each team took, by the side it started on. */
  readonly byTeam: Readonly<Record<OpeningSide, number>>;
  /** Who took the round's first kill most, and who fell first most. */
  readonly openers: readonly Counted<PlayerSlot>[];
  readonly firstDeaths: readonly Counted<PlayerSlot>[];
}

/** Who won the openings and who decided them, over duels that are already the openings. */
export function openingReading(demo: ParsedDemo, duels: readonly Duel[]): OpeningReading {
  const teams = openingSideBySlot(demo);
  const byTeam = { ct: 0, t: 0 };
  for (const duel of duels) {
    const team = teams[duel.attacker];
    if (team !== undefined) byTeam[team] += 1;
  }

  return {
    byTeam,
    openers: countBy(duels, (duel) => duel.attacker),
    firstDeaths: countBy(duels, (duel) => duel.victim),
  };
}
