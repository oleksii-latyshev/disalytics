import type { Blind, ParsedDemo, Team } from '../schema';
import { sidesBySlotAtRound } from './selectors';

function opponentAttackerSide(
  blind: Blind,
  sides: readonly (Team | undefined)[],
): Team | undefined {
  if (blind.attacker === null) return undefined;

  const attackerSide = sides[blind.attacker];
  const victimSide = sides[blind.victim];
  return attackerSide !== undefined && victimSide !== undefined && attackerSide !== victimSide
    ? attackerSide
    : undefined;
}

/** Opponent blind duration attributed to the side the attacker held that round. */
export function matchEnemyBlindTime(demo: ParsedDemo): Readonly<Record<Team, number>> {
  const totals: Record<Team, number> = { CT: 0, T: 0 };
  const { blinds, rounds } = demo.events;
  let first = 0;

  for (const [roundIndex, round] of rounds.entries()) {
    while (first < blinds.length && (blinds[first]?.tick ?? 0) < round.startTick) first += 1;

    const sides = sidesBySlotAtRound(demo, roundIndex);

    for (let index = first; index < blinds.length; index++) {
      const blind = blinds[index];
      if (blind === undefined || blind.tick > round.endTick) break;

      const side = opponentAttackerSide(blind, sides);
      if (side !== undefined) totals[side] += blind.durationSeconds;
    }
  }

  return totals;
}
