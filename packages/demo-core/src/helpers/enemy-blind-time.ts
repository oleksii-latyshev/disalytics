import type { Blind, ParsedDemo, PlayerSlot, Team } from '../schema';
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

interface OpponentBlind {
  readonly attacker: PlayerSlot;
  readonly side: Team;
  readonly durationSeconds: number;
}

function* opponentBlinds(demo: ParsedDemo): Generator<OpponentBlind> {
  const { blinds, rounds } = demo.events;
  let first = 0;

  for (const [roundIndex, round] of rounds.entries()) {
    while (first < blinds.length && (blinds[first]?.tick ?? 0) < round.startTick) first += 1;

    const sides = sidesBySlotAtRound(demo, roundIndex);

    for (let index = first; index < blinds.length; index++) {
      const blind = blinds[index];
      if (blind === undefined || blind.tick > round.endTick) break;

      const side = opponentAttackerSide(blind, sides);
      if (side !== undefined && blind.attacker !== null) {
        yield { attacker: blind.attacker, side, durationSeconds: blind.durationSeconds };
      }
    }
  }
}

/**
 * Whether the recording can say anything about flashes. Some GOTV recordings carry no
 * `player_blind` events at all, and then a total of zero is an absence of data rather than a
 * measurement — unless no flashbang was thrown, in which case zero is genuine.
 */
export function hasBlindEvents(demo: ParsedDemo): boolean {
  const { blinds, grenades } = demo.events;
  return blinds.length > 0 || !grenades.some((grenade) => grenade.type === 'flashbang');
}

/** Opponent blind duration attributed to the side the attacker held that round. */
export function matchEnemyBlindTime(demo: ParsedDemo): Readonly<Record<Team, number>> {
  const totals: Record<Team, number> = { CT: 0, T: 0 };
  for (const blind of opponentBlinds(demo)) totals[blind.side] += blind.durationSeconds;
  return totals;
}

/** The same duration, attributed to the player whose flash caused it. */
export function matchPlayerEnemyBlindTime(demo: ParsedDemo): ReadonlyMap<PlayerSlot, number> {
  const totals = new Map<PlayerSlot, number>();
  for (const blind of opponentBlinds(demo)) {
    totals.set(blind.attacker, (totals.get(blind.attacker) ?? 0) + blind.durationSeconds);
  }
  return totals;
}

/** What one player's flashes did to people, counted per affected player rather than per flashbang. */
export interface PlayerBlinds {
  /** Opponents blinded: one per affected opponent per flash. */
  readonly enemies: number;
  /** Their blind time, the figure `matchPlayerEnemyBlindTime` states. */
  readonly enemySeconds: number;
  /** Teammates blinded, by `Blind.isTeammate`. The thrower's own blindness is not a team flash. */
  readonly teammates: number;
}

function* teammateBlinds(demo: ParsedDemo): Generator<PlayerSlot> {
  const { blinds, rounds } = demo.events;
  let first = 0;

  for (const round of rounds) {
    while (first < blinds.length && (blinds[first]?.tick ?? 0) < round.startTick) first += 1;

    for (let index = first; index < blinds.length; index++) {
      const blind = blinds[index];
      if (blind === undefined || blind.tick > round.endTick) break;
      if (blind.attacker !== null && blind.isTeammate && blind.attacker !== blind.victim) {
        yield blind.attacker;
      }
    }
  }
}

interface BlindTally {
  enemies: number;
  enemySeconds: number;
  teammates: number;
}

/** Opponents and teammates blinded, attributed to the player whose flash caused it. */
export function matchPlayerBlinds(demo: ParsedDemo): ReadonlyMap<PlayerSlot, PlayerBlinds> {
  const totals = new Map<PlayerSlot, BlindTally>();
  const tally = (slot: PlayerSlot): BlindTally => {
    const existing = totals.get(slot);
    if (existing !== undefined) return existing;

    const fresh = { enemies: 0, enemySeconds: 0, teammates: 0 };
    totals.set(slot, fresh);
    return fresh;
  };

  for (const blind of opponentBlinds(demo)) {
    const entry = tally(blind.attacker);
    entry.enemies += 1;
    entry.enemySeconds += blind.durationSeconds;
  }
  for (const attacker of teammateBlinds(demo)) tally(attacker).teammates += 1;

  return totals;
}
