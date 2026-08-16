import type { ParsedDemo, PlayerSlot, Round, Team, Tick } from '../schema';
import { lastIndexAtOrBefore } from './player-state';
import { sidesBySlotAtRound } from './selectors';

export interface PlayerRoundStats {
  kills: number;
  deaths: number;
  /** Health damage dealt to opponents. Damage to a teammate is not a contribution to the round. */
  damage: number;
  /** What the slot's equipment was worth at freeze-time end, or 0 where the round has no entry. */
  equipmentValue: number;
}

const EMPTY: PlayerRoundStats = { kills: 0, deaths: 0, damage: 0, equipmentValue: 0 };

/**
 * The first event of a round, by binary search. `lastIndexAtOrBefore` includes an event standing
 * exactly on the tick, so the walk back over the ties is what makes this the *first* event of the
 * round rather than the second.
 *
 * Starting from a search rather than from index zero is what keeps this cheap: it is called off the
 * 10 Hz readout while a match plays, and scanning forty minutes of damage to reach round 27 is the
 * difference between a lookup and a cost.
 */
function firstOfRound(events: readonly { tick: Tick }[], startTick: Tick): number {
  let index = lastIndexAtOrBefore(events, startTick);

  while (index >= 0 && events[index]?.tick === startTick) index -= 1;

  return index + 1;
}

function countKills(demo: ParsedDemo, round: Round, slot: PlayerSlot): [number, number] {
  const { kills } = demo.events;
  let killCount = 0;
  let deathCount = 0;

  for (let index = firstOfRound(kills, round.startTick); index < kills.length; index++) {
    const kill = kills[index];
    if (kill === undefined || kill.tick > round.endTick) break;

    if (kill.attacker === slot) killCount += 1;
    if (kill.victim === slot) deathCount += 1;
  }

  return [killCount, deathCount];
}

function sumDamage(
  demo: ParsedDemo,
  round: Round,
  slot: PlayerSlot,
  sides: readonly (Team | undefined)[],
): number {
  const { damage } = demo.events;
  let total = 0;

  for (let index = firstOfRound(damage, round.startTick); index < damage.length; index++) {
    const hit = damage[index];
    if (hit === undefined || hit.tick > round.endTick) break;

    if (hit.attacker !== slot || sides[hit.victim] === sides[slot]) continue;

    total += hit.healthDamage;
  }

  return total;
}

/** How many players each side still had when a round ended. */
export type SideSurvivors = Record<Team, number>;

/**
 * How many players each side still had when a round ended — `docs/DESIGN.md` §7.3's two digits,
 * where `5 : 1` is a stomp and `1 : 1` is a clutch.
 *
 * Both sides rather than the winner's alone: a cell that shows one number leaves the reader to
 * infer whose it is from the tint, and the count that says how *close* a round was is the pair.
 *
 * Side membership is the round's own economy, read at freeze-time end: `PlayerInfo.team` is the
 * end-of-match roster and names the wrong side for half a match. A slot the round recorded no side
 * for stood on neither, so a four-man side reads a maximum of four rather than borrowing a fifth.
 *
 * The window closes at `endTick`, which is what keeps the post-round kills that follow most rounds
 * out of the count.
 */
export function roundSurvivors(demo: ParsedDemo, roundIndex: number): SideSurvivors {
  const alive: SideSurvivors = { CT: 0, T: 0 };
  const round = demo.events.rounds.at(roundIndex);
  if (round === undefined) return alive;

  const sides: (Team | null)[] = [];

  for (const entry of round.economy) {
    sides[entry.slot] = entry.team;

    if (entry.team !== null) alive[entry.team] += 1;
  }

  const { kills } = demo.events;

  for (let index = firstOfRound(kills, round.startTick); index < kills.length; index++) {
    const kill = kills[index];
    if (kill === undefined || kill.tick > round.endTick) break;

    const side = sides[kill.victim];
    if (side === null || side === undefined) continue;

    alive[side] -= 1;
  }

  return { CT: Math.max(alive.CT, 0), T: Math.max(alive.T, 0) };
}

/**
 * What one player did in one round. The rule lives here rather than in the component that shows it:
 * a count of kills between two ticks is the kind of thing that ends up written twice and drifting.
 *
 * Rounds are bounded by `startTick` and `endTick` rather than by the freeze-time end, so a kill
 * during the buy phase — rare, and always a story — is still counted against the round it happened
 * in.
 */
export function playerRoundStats(
  demo: ParsedDemo,
  roundIndex: number | undefined,
  slot: PlayerSlot,
): PlayerRoundStats {
  const round = roundIndex === undefined ? undefined : demo.events.rounds.at(roundIndex);
  if (round === undefined) return EMPTY;

  // Sides are read from the round rather than from the end-of-match roster, or the halftime swap
  // would call half a match's damage friendly fire.
  const sides = sidesBySlotAtRound(demo, roundIndex);
  const [kills, deaths] = countKills(demo, round, slot);
  const economy = round.economy.find((entry) => entry.slot === slot);

  return {
    kills,
    deaths,
    damage: sumDamage(demo, round, slot, sides),
    equipmentValue: economy?.equipmentValue ?? 0,
  };
}
