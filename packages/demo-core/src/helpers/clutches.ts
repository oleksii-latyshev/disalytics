import type { Kill, ParsedDemo, PlayerSlot, Round, Team } from '../schema';
import { sidesBySlotAtRound } from './selectors';

export interface Clutch {
  readonly roundIndex: number;
  readonly player: PlayerSlot;
  readonly side: Team;
  readonly opponents: number;
}

interface ClutchTrigger {
  readonly clutcher: PlayerSlot;
  readonly opponents: number;
}

function initialAlive(round: Round): Record<Team, Set<PlayerSlot>> | null {
  if (round.economy.length === 0 || round.reason === 'draw') return null;

  const alive: Record<Team, Set<PlayerSlot>> = { CT: new Set(), T: new Set() };
  for (const entry of round.economy) {
    if (entry.team !== null) alive[entry.team].add(entry.slot);
  }

  if (alive.CT.size === 0 || alive.T.size === 0) return null;
  return alive;
}

function checkClutchTrigger(
  aliveByWinner: Set<PlayerSlot>,
  aliveByOpponent: Set<PlayerSlot>,
): ClutchTrigger | null {
  if (aliveByWinner.size !== 1 || aliveByOpponent.size < 1) return null;
  const [sole] = aliveByWinner;
  return sole === undefined ? null : { clutcher: sole, opponents: aliveByOpponent.size };
}

function roundClutch(
  roundIndex: number,
  round: Round,
  kills: readonly Kill[],
  startIndex: number,
  sides: readonly (Team | undefined)[],
): Clutch | null {
  const aliveBySide = initialAlive(round);
  if (aliveBySide === null) return null;

  const winner = round.winner;
  const opponent: Team = winner === 'CT' ? 'T' : 'CT';
  let trigger = checkClutchTrigger(aliveBySide[winner], aliveBySide[opponent]);

  for (let index = startIndex; index < kills.length; index++) {
    const kill = kills[index];
    if (kill === undefined || kill.tick > round.endTick) break;

    const victimSide = sides[kill.victim];
    if (victimSide === undefined || victimSide === null) continue;

    aliveBySide[victimSide].delete(kill.victim);

    if (victimSide === winner && trigger === null) {
      trigger = checkClutchTrigger(aliveBySide[winner], aliveBySide[opponent]);
    }
  }

  if (trigger !== null && aliveBySide[winner].has(trigger.clutcher)) {
    return {
      roundIndex,
      player: trigger.clutcher,
      side: winner,
      opponents: trigger.opponents,
    };
  }

  return null;
}

/**
 * Rounds won from a 1vX situation as the last player alive on a team, oldest round first.
 *
 * A clutch begins when the round's eventual winner is reduced to one alive player while at least one
 * opponent remains. Rounds won with multiple survivors, rounds where the lone survivor died before
 * winning, and rounds without economy are left out.
 */
export function matchClutches(demo: ParsedDemo): readonly Clutch[] {
  const { kills, rounds } = demo.events;
  const clutches: Clutch[] = [];
  let first = 0;

  for (const [roundIndex, round] of rounds.entries()) {
    while (first < kills.length && (kills[first]?.tick ?? 0) < round.startTick) first += 1;

    const sides = sidesBySlotAtRound(demo, roundIndex);
    const clutch = roundClutch(roundIndex, round, kills, first, sides);
    if (clutch !== null) clutches.push(clutch);
  }

  return clutches;
}
