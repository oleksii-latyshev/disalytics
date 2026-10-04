import type { Frame, ParsedDemo, PlayerSlot, Round, Team } from '../schema';
import { matchPlayerBlinds } from './enemy-blind-time';
import { matchPlayerFlashAssists } from './player-stats';
import { GRENADE_REFERENCES } from './reference-data';
import type { OpeningSide } from './score';
import { matchScoreboard } from './scoreboard';
import { frameForTick, sidesBySlotAtRound, slotSampleIndex } from './selectors';
import {
  THROWN_UTILITY_KINDS,
  type UtilityKind,
  utilityHeld,
  utilityKindOfGrenade,
} from './utility';
import { matchPlayerUtilityDamage } from './utility-damage';

/** The kinds a player throws, which is every kind but the defuse kit. */
export type ThrownKind = Exclude<UtilityKind, 'kit'>;

export type ThrownCounts = Readonly<Record<ThrownKind, number>>;

/** Everything the Utility tab states for one player, or — summed — for one team. */
export interface UtilityFigures {
  /** Rounds the figures are over: the rounds played for a player, the team's rounds for a team. */
  readonly rounds: number;
  /** Grenades thrown inside a round's window, by kind, whether or not they went off. */
  readonly thrown: ThrownCounts;
  /** Opponents blinded, one per affected opponent per flash. */
  readonly enemiesBlinded: number;
  readonly enemyBlindSeconds: number;
  readonly teamFlashes: number;
  readonly flashAssists: number;
  /** Opponent health damage from HE and fire; `matchPlayerUtilityDamage`'s figure. */
  readonly utilityDamage: number;
  /** Utility the player was still holding when they died, in dollars at that round's prices. */
  readonly unusedDollars: number;
  /** The same utility as a count of grenades. */
  readonly unusedGrenades: number;
}

export interface PlayerUtilityStats extends UtilityFigures {
  readonly slot: PlayerSlot;
}

export interface TeamUtilityStats {
  readonly team: OpeningSide;
  readonly players: readonly PlayerUtilityStats[];
  readonly total: UtilityFigures;
}

const THROWN_KINDS: readonly ThrownKind[] = THROWN_UTILITY_KINDS.filter(
  (kind): kind is ThrownKind => kind !== 'kit',
);

/** Grenades thrown, all kinds. */
export function totalThrown(thrown: ThrownCounts): number {
  return THROWN_KINDS.reduce((sum, kind) => sum + thrown[kind], 0);
}

/** Opponents blinded per flashbang thrown; `null` when none was thrown. */
export function enemiesPerFlash(figures: UtilityFigures): number | null {
  return figures.thrown.flash === 0 ? null : figures.enemiesBlinded / figures.thrown.flash;
}

/** Average blind time per opponent blinded, in seconds; `null` when none was blinded. */
export function averageEnemyBlind(figures: UtilityFigures): number | null {
  return figures.enemiesBlinded === 0 ? null : figures.enemyBlindSeconds / figures.enemiesBlinded;
}

function emptyThrown(): Record<ThrownKind, number> {
  return { he: 0, flash: 0, smoke: 0, fire: 0, decoy: 0 };
}

function priceOf(id: string): number {
  return GRENADE_REFERENCES.find((entry) => entry.id === id)?.price ?? 0;
}

/**
 * What one grenade costs in the shop. Fire is the one kind with two prices: a CT's incendiary is
 * dearer than a T's molotov, and the bitfield carries neither, so the side held that round names it.
 */
function grenadePrice(kind: ThrownKind, side: Team | undefined): number {
  switch (kind) {
    case 'he':
      return priceOf('he');
    case 'flash':
      return priceOf('flash');
    case 'smoke':
      return priceOf('smoke');
    case 'decoy':
      return priceOf('decoy');
    case 'fire':
      return priceOf(side === 'CT' ? 'incendiary' : 'fire');
  }
}

/**
 * The sample a death is read from: the last one at or before the death tick on which the player was
 * still alive. The nearest sample can already be the dead one, whose bitfield no longer says what
 * they were carrying, so this steps back — never past the round's own start.
 */
function frameBeforeDeath(demo: ParsedDemo, round: Round, tick: number, slot: PlayerSlot): Frame {
  const { track } = demo;
  const floor = frameForTick(track, round.startTick);
  const atOrBefore = Math.floor((tick / track.tickRate) * track.sampleHz);
  let frame = Math.max(floor, Math.min(atOrBefore, track.frameCount - 1));

  while (frame > floor && track.health[slotSampleIndex(track, frame, slot)] === 0) frame -= 1;
  return frame as Frame;
}

interface Unused {
  dollars: number;
  grenades: number;
}

function addHeld(into: Unused, bits: number, side: Team | undefined): void {
  for (const held of utilityHeld(bits)) {
    if (held.kind === 'kit') continue;
    into.dollars += grenadePrice(held.kind, side);
    into.grenades += 1;
  }
}

/**
 * What each player died holding, summed over their deaths. A death is a `Kill` in the round's
 * window, whoever or whatever caused it; a player who lived took theirs to the next round, where it
 * is no waste. The bitfield is read at 16 Hz, so a grenade thrown in the last sixteenth of a second
 * is still counted as held — the same approximation the held-utility icons carry.
 */
function matchPlayerUnusedUtility(demo: ParsedDemo): ReadonlyMap<PlayerSlot, Unused> {
  const { kills, rounds } = demo.events;
  const { track } = demo;
  const totals = new Map<PlayerSlot, Unused>();
  if (track.frameCount === 0) return totals;
  let first = 0;

  for (const [roundIndex, round] of rounds.entries()) {
    while (first < kills.length && (kills[first]?.tick ?? 0) < round.startTick) first += 1;

    const sides = sidesBySlotAtRound(demo, roundIndex);

    for (let index = first; index < kills.length; index++) {
      const kill = kills[index];
      if (kill === undefined || kill.tick > round.endTick) break;

      const frame = frameBeforeDeath(demo, round, kill.tick, kill.victim);
      const bits = track.grenades[slotSampleIndex(track, frame, kill.victim)] ?? 0;

      const entry = totals.get(kill.victim) ?? { dollars: 0, grenades: 0 };
      addHeld(entry, bits, sides[kill.victim]);
      totals.set(kill.victim, entry);
    }
  }

  return totals;
}

/** Grenades thrown, by thrower and kind, inside each round's `[startTick, endTick]`. */
function matchPlayerThrown(demo: ParsedDemo): ReadonlyMap<PlayerSlot, Record<ThrownKind, number>> {
  const { grenades, rounds } = demo.events;
  const totals = new Map<PlayerSlot, Record<ThrownKind, number>>();
  let first = 0;

  for (const round of rounds) {
    while (first < grenades.length && (grenades[first]?.throwTick ?? 0) < round.startTick) {
      first += 1;
    }

    for (let index = first; index < grenades.length; index++) {
      const grenade = grenades[index];
      if (grenade === undefined || grenade.throwTick > round.endTick) break;

      const counts = totals.get(grenade.thrower) ?? emptyThrown();
      const kind = utilityKindOfGrenade(grenade.type);
      if (kind !== 'kit') counts[kind] += 1;
      totals.set(grenade.thrower, counts);
    }
  }

  return totals;
}

function sumFigures(rounds: number, parts: readonly UtilityFigures[]): UtilityFigures {
  const thrown = emptyThrown();
  for (const part of parts) for (const kind of THROWN_KINDS) thrown[kind] += part.thrown[kind];

  return {
    rounds,
    thrown,
    enemiesBlinded: parts.reduce((sum, part) => sum + part.enemiesBlinded, 0),
    enemyBlindSeconds: parts.reduce((sum, part) => sum + part.enemyBlindSeconds, 0),
    teamFlashes: parts.reduce((sum, part) => sum + part.teamFlashes, 0),
    flashAssists: parts.reduce((sum, part) => sum + part.flashAssists, 0),
    utilityDamage: parts.reduce((sum, part) => sum + part.utilityDamage, 0),
    unusedDollars: parts.reduce((sum, part) => sum + part.unusedDollars, 0),
    unusedGrenades: parts.reduce((sum, part) => sum + part.unusedGrenades, 0),
  };
}

/**
 * The Utility tab's figures: one row per player in the teams `matchScoreboard` names — by opening
 * side — and a total per team.
 *
 * Every figure reuses the selector that owns its rule: utility damage and enemy blind time are the
 * Players tab's own, and **flash assists are `matchPlayerFlashAssists`, the same window**. Flash
 * figures are zero when the recording carries no `player_blind` events, and that zero is unknown
 * rather than measured: the caller gates them on `hasBlindEvents`.
 *
 * A team's `rounds` is the most rounds any of its players was recorded for, so a team's per-round
 * figure is the team's, not a player's.
 */
export function matchUtilityStats(demo: ParsedDemo): readonly [TeamUtilityStats, TeamUtilityStats] {
  const boards = matchScoreboard(demo);
  const thrown = matchPlayerThrown(demo);
  const blinds = matchPlayerBlinds(demo);
  const damage = matchPlayerUtilityDamage(demo);
  const assists = matchPlayerFlashAssists(demo);
  const unused = matchPlayerUnusedUtility(demo);

  const teamOf = (board: (typeof boards)[number]): TeamUtilityStats => {
    const players = board.players.map((totals): PlayerUtilityStats => {
      const blind = blinds.get(totals.slot);
      const left = unused.get(totals.slot);

      return {
        slot: totals.slot,
        rounds: totals.rounds,
        thrown: thrown.get(totals.slot) ?? emptyThrown(),
        enemiesBlinded: blind?.enemies ?? 0,
        enemyBlindSeconds: blind?.enemySeconds ?? 0,
        teamFlashes: blind?.teammates ?? 0,
        flashAssists: assists.get(totals.slot) ?? 0,
        utilityDamage: damage.get(totals.slot) ?? 0,
        unusedDollars: left?.dollars ?? 0,
        unusedGrenades: left?.grenades ?? 0,
      };
    });

    const rounds = players.reduce((most, player) => Math.max(most, player.rounds), 0);
    return { team: board.team, players, total: sumFigures(rounds, players) };
  };

  return [teamOf(boards[0]), teamOf(boards[1])];
}
