import type { Damage, ParsedDemo, PlayerSlot, Team } from '../schema';
import { sidesBySlotAtRound } from './selectors';
import { isUtilityKind, killWeaponClass } from './weapons';

function utilityAttackerSide(hit: Damage, sides: readonly (Team | undefined)[]): Team | undefined {
  if (hit.attacker === null || !isUtilityKind(killWeaponClass(hit.weapon))) return undefined;

  const attackerSide = sides[hit.attacker];
  const victimSide = sides[hit.victim];
  return attackerSide !== undefined && victimSide !== undefined && attackerSide !== victimSide
    ? attackerSide
    : undefined;
}

interface UtilityHit {
  readonly attacker: PlayerSlot;
  readonly side: Team;
  readonly healthDamage: number;
}

function* opponentUtilityHits(demo: ParsedDemo): Generator<UtilityHit> {
  const { damage, rounds } = demo.events;
  let first = 0;

  for (const [roundIndex, round] of rounds.entries()) {
    while (first < damage.length && (damage[first]?.tick ?? 0) < round.startTick) first += 1;

    const sides = sidesBySlotAtRound(demo, roundIndex);

    for (let index = first; index < damage.length; index++) {
      const hit = damage[index];
      if (hit === undefined || hit.tick > round.endTick) break;

      const side = utilityAttackerSide(hit, sides);
      if (side !== undefined && hit.attacker !== null) {
        yield { attacker: hit.attacker, side, healthDamage: hit.healthDamage };
      }
    }
  }
}

/** Opponent health damage dealt with utility, attributed to the side held that round. */
export function matchUtilityDamage(demo: ParsedDemo): Readonly<Record<Team, number>> {
  const totals: Record<Team, number> = { CT: 0, T: 0 };
  for (const hit of opponentUtilityHits(demo)) totals[hit.side] += hit.healthDamage;
  return totals;
}

/** The same damage, attributed to the player who dealt it. */
export function matchPlayerUtilityDamage(demo: ParsedDemo): ReadonlyMap<PlayerSlot, number> {
  const totals = new Map<PlayerSlot, number>();
  for (const hit of opponentUtilityHits(demo)) {
    totals.set(hit.attacker, (totals.get(hit.attacker) ?? 0) + hit.healthDamage);
  }
  return totals;
}
