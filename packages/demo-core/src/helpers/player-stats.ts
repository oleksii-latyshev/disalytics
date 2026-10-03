import type { Blind, Kill, ParsedDemo, PlayerSlot, Round, Team } from '../schema';
import { matchClutches } from './clutches';
import { type Duel, isOpponentDuel, matchDuels, openingDuels, tradeKills } from './duels';
import { matchPlayerEnemyBlindTime } from './enemy-blind-time';
import type { OpeningSide } from './score';
import { matchScoreboard, type PlayerTotals, type TeamScoreboard } from './scoreboard';
import { sidesBySlotAtRound } from './selectors';
import { matchPlayerUtilityDamage } from './utility-damage';

/**
 * HLTV's published Rating 1.0: `(KillRating + 0.7 × SurvivalRating + MultiKillRating) / 2.7`.
 * The three divisors are the averages HLTV states for a player, so an average player scores 1.00.
 * Rating 2.0 and 3.0 are not public and are never approximated here.
 */
export const RATING_1_0 = {
  averageKillsPerRound: 0.679,
  averageSurvivalPerRound: 0.317,
  averageMultiKillValuePerRound: 1.277,
  survivalWeight: 0.7,
  divisor: 2.7,
  /** The value of a round with exactly one, two, three, four and five kills. */
  multiKillWeights: [1, 4, 9, 16, 25],
} as const;

/** The multi-kill rounds a row states, 2K to 5K. */
export const MULTI_KILL_SIZES = [2, 3, 4, 5] as const;

export type MultiKillRounds = readonly [number, number, number, number];

/** Everything the Players table states for one player. */
export interface PlayerStats {
  readonly slot: PlayerSlot;
  /** Rounds this slot was recorded on a side for. */
  readonly rounds: number;
  readonly kills: number;
  readonly assists: number;
  readonly deaths: number;
  /** Health damage to opponents per round played; 0 when no round was played. */
  readonly adr: number;
  /** Share of kills that were headshots, 0–100. */
  readonly headshotPercent: number;
  /** Share of rounds with a kill, an assist, survival or a trade, 0–100. */
  readonly kastPercent: number;
  readonly openingWon: number;
  readonly openingLost: number;
  /** Opponent kills that answered a teammate's death inside the trade window. */
  readonly tradeKills: number;
  /** This player's deaths that a teammate answered inside the trade window. */
  readonly deathsTraded: number;
  /** Rounds with exactly two, three, four and five opponent kills. */
  readonly multiKillRounds: MultiKillRounds;
  readonly clutchesWon: number;
  readonly utilityDamage: number;
  readonly flashAssists: number;
  readonly enemyBlindSeconds: number;
  /** HLTV Rating 1.0; 0 when no round was played. */
  readonly rating: number;
}

export interface TeamPlayerStats {
  readonly team: OpeningSide;
  readonly score: number;
  readonly players: readonly PlayerStats[];
}

interface Tally {
  kastRounds: number;
  openingWon: number;
  openingLost: number;
  tradeKills: number;
  deathsTraded: number;
  /** Index n − 1 counts rounds with exactly n opponent kills, capped at five. */
  killRounds: [number, number, number, number, number];
  clutchesWon: number;
  flashAssists: number;
}

function newTally(): Tally {
  return {
    kastRounds: 0,
    openingWon: 0,
    openingLost: 0,
    tradeKills: 0,
    deathsTraded: 0,
    killRounds: [0, 0, 0, 0, 0],
    clutchesWon: 0,
    flashAssists: 0,
  };
}

/** Rating 1.0 from the figures it is made of. `opponentKills` is what a teamkill must not feed. */
export function rating1(
  rounds: number,
  opponentKills: number,
  deaths: number,
  killRounds: readonly number[],
): number {
  if (rounds === 0) return 0;

  const killRating = opponentKills / rounds / RATING_1_0.averageKillsPerRound;
  const survivalRating = (rounds - deaths) / rounds / RATING_1_0.averageSurvivalPerRound;
  const multiKillValue = RATING_1_0.multiKillWeights.reduce(
    (sum, weight, index) => sum + weight * (killRounds[index] ?? 0),
    0,
  );
  const multiKillRating = multiKillValue / rounds / RATING_1_0.averageMultiKillValuePerRound;

  return (
    (killRating + RATING_1_0.survivalWeight * survivalRating + multiKillRating) / RATING_1_0.divisor
  );
}

interface RoundContext {
  readonly demo: ParsedDemo;
  readonly round: Round;
  readonly roundIndex: number;
  readonly sides: readonly (Team | undefined)[];
}

/** An opponent flash on `victim` that was still running at `killTick`, by somebody but the killer. */
function isFlashAssist(
  blind: Blind,
  killTick: number,
  killer: PlayerSlot,
  victim: PlayerSlot,
  context: RoundContext,
): blind is Blind & { readonly attacker: PlayerSlot } {
  const { attacker } = blind;
  if (attacker === null || attacker === killer) return false;
  if (blind.victim !== victim || blind.isTeammate) return false;
  if (blind.tick + blind.durationSeconds * context.demo.track.tickRate < killTick) return false;

  const flasherSide = context.sides[attacker];
  return flasherSide === context.sides[killer] && flasherSide !== context.sides[victim];
}

/**
 * A kill by a teammate of `flasher` on a victim who was, at that tick, blinded by `flasher` — an
 * opponent flash still running. The flasher is not the killer, and is credited once per kill.
 */
function flashAssistersOf(
  context: RoundContext,
  killTick: number,
  killer: PlayerSlot,
  victim: PlayerSlot,
): ReadonlySet<PlayerSlot> {
  const flashers = new Set<PlayerSlot>();

  for (const blind of context.demo.events.blinds) {
    if (blind.tick > killTick) break;
    if (blind.tick < context.round.startTick) continue;
    if (isFlashAssist(blind, killTick, killer, victim, context)) flashers.add(blind.attacker);
  }

  return flashers;
}

type Tallies = (slot: PlayerSlot) => Tally;

interface RoundOutcome {
  readonly killed: ReadonlySet<PlayerSlot>;
  readonly assisted: ReadonlySet<PlayerSlot>;
  readonly deaths: ReadonlySet<PlayerSlot>;
  readonly traded: ReadonlySet<PlayerSlot> | undefined;
}

function countKast(round: Round, outcome: RoundOutcome, tallyOf: Tallies): void {
  for (const entry of round.economy) {
    if (entry.team === null) continue;

    const { slot } = entry;
    const contributed = outcome.killed.has(slot) || outcome.assisted.has(slot);
    if (contributed || !outcome.deaths.has(slot) || outcome.traded?.has(slot) === true) {
      tallyOf(slot).kastRounds += 1;
    }
  }
}

/** What happened in one round, as the sets KAST and the kill-count buckets are read from. */
function tallyRound(
  context: RoundContext,
  duels: readonly Duel[],
  deaths: ReadonlySet<PlayerSlot>,
  traded: ReadonlySet<PlayerSlot> | undefined,
  tallyOf: Tallies,
): void {
  const { demo, round } = context;
  const killed = new Set<PlayerSlot>();
  const assisted = new Set<PlayerSlot>();
  const killCounts = new Map<PlayerSlot, number>();

  for (const duel of duels) {
    if (!isOpponentDuel(duel)) continue;

    const kill = demo.events.kills[duel.killIndex];
    if (kill === undefined) continue;

    killed.add(duel.attacker);
    killCounts.set(duel.attacker, (killCounts.get(duel.attacker) ?? 0) + 1);
    if (kill.assister !== null) assisted.add(kill.assister);

    for (const flasher of flashAssistersOf(context, kill.tick, duel.attacker, duel.victim)) {
      tallyOf(flasher).flashAssists += 1;
    }
  }

  for (const [slot, count] of killCounts) {
    const bucket = Math.min(count, RATING_1_0.multiKillWeights.length) - 1;
    const { killRounds } = tallyOf(slot);
    killRounds[bucket] = (killRounds[bucket] ?? 0) + 1;
  }

  countKast(round, { killed, assisted, deaths, traded }, tallyOf);
}

function victimsInRound(
  kills: readonly Kill[],
  from: number,
  round: Round,
): ReadonlySet<PlayerSlot> {
  const victims = new Set<PlayerSlot>();

  for (let index = from; index < kills.length; index++) {
    const kill = kills[index];
    if (kill === undefined || kill.tick > round.endTick) break;
    victims.add(kill.victim);
  }

  return victims;
}

function duelsOfRound(duels: readonly Duel[], from: number, roundIndex: number): readonly Duel[] {
  const inRound: Duel[] = [];

  for (let index = from; index < duels.length; index++) {
    const duel = duels[index];
    if (duel === undefined || duel.roundIndex !== roundIndex) break;
    inRound.push(duel);
  }

  return inRound;
}

function tallyRounds(
  demo: ParsedDemo,
  tradedByRound: ReadonlyMap<number, ReadonlySet<PlayerSlot>>,
  tallyOf: Tallies,
): void {
  const { kills, rounds } = demo.events;
  const duels = matchDuels(demo);
  let nextKill = 0;
  let nextDuel = 0;

  for (const [roundIndex, round] of rounds.entries()) {
    while (nextKill < kills.length && (kills[nextKill]?.tick ?? 0) < round.startTick) nextKill += 1;
    while (nextDuel < duels.length && (duels[nextDuel]?.roundIndex ?? 0) < roundIndex) {
      nextDuel += 1;
    }

    const deaths = victimsInRound(kills, nextKill, round);
    const roundDuels = duelsOfRound(duels, nextDuel, roundIndex);

    const context = { demo, round, roundIndex, sides: sidesBySlotAtRound(demo, roundIndex) };
    tallyRound(context, roundDuels, deaths, tradedByRound.get(roundIndex), tallyOf);
  }
}

function tallyEvents(demo: ParsedDemo, tallyOf: Tallies): void {
  for (const duel of openingDuels(demo)) {
    tallyOf(duel.attacker).openingWon += 1;
    tallyOf(duel.victim).openingLost += 1;
  }

  const tradedByRound = new Map<number, Set<PlayerSlot>>();
  for (const trade of tradeKills(demo)) {
    tallyOf(trade.player).tradeKills += 1;
    tallyOf(trade.avenged).deathsTraded += 1;
    const traded = tradedByRound.get(trade.roundIndex) ?? new Set<PlayerSlot>();
    traded.add(trade.avenged);
    tradedByRound.set(trade.roundIndex, traded);
  }

  for (const clutch of matchClutches(demo)) tallyOf(clutch.player).clutchesWon += 1;

  tallyRounds(demo, tradedByRound, tallyOf);
}

function percentOf(part: number, whole: number): number {
  return whole === 0 ? 0 : (part / whole) * 100;
}

function rowOf(
  totals: PlayerTotals,
  tally: Tally,
  utilityDamage: number,
  blindSeconds: number,
): PlayerStats {
  const opponentKills = tally.killRounds.reduce(
    (sum, count, index) => sum + count * (index + 1),
    0,
  );

  return {
    slot: totals.slot,
    rounds: totals.rounds,
    kills: totals.kills,
    assists: totals.assists,
    deaths: totals.deaths,
    adr: totals.rounds === 0 ? 0 : totals.damage / totals.rounds,
    headshotPercent: percentOf(totals.headshots, totals.kills),
    kastPercent: percentOf(tally.kastRounds, totals.rounds),
    openingWon: tally.openingWon,
    openingLost: tally.openingLost,
    tradeKills: tally.tradeKills,
    deathsTraded: tally.deathsTraded,
    multiKillRounds: [
      tally.killRounds[1],
      tally.killRounds[2],
      tally.killRounds[3],
      tally.killRounds[4],
    ],
    clutchesWon: tally.clutchesWon,
    utilityDamage,
    flashAssists: tally.flashAssists,
    enemyBlindSeconds: blindSeconds,
    rating: rating1(totals.rounds, opponentKills, totals.deaths, tally.killRounds),
  };
}

/**
 * One row per player, grouped into the two teams `matchScoreboard` names — by opening side.
 *
 * K, A, D, damage and rounds are `matchScoreboard`'s own, so a row here and a row there cannot
 * disagree. Everything else is derived from the selectors that already own the rule: openings,
 * trades, clutches, utility damage and blind time.
 *
 * - **KAST**: of the rounds the player was recorded on a side for, those with an opponent kill by
 *   them, an assist on an opponent kill, a survival (no death of any kind), or a death a teammate
 *   traded.
 * - **Multi-kill rounds** count opponent kills only; a round is one bucket, its exact kill count.
 * - **Flash assist**: see `flashAssistersOf`.
 * - **Rating 1.0** uses opponent kills for its kill and multi-kill terms and every death for
 *   survival, so a teamkill does not raise a rating and a suicide lowers it.
 */
export function matchPlayerStats(demo: ParsedDemo): readonly [TeamPlayerStats, TeamPlayerStats] {
  const boards = matchScoreboard(demo);
  const tallies = new Map<PlayerSlot, Tally>();
  const tallyOf: Tallies = (slot) => {
    const existing = tallies.get(slot);
    if (existing !== undefined) return existing;

    const fresh = newTally();
    tallies.set(slot, fresh);
    return fresh;
  };

  tallyEvents(demo, tallyOf);

  const utilityDamage = matchPlayerUtilityDamage(demo);
  const blindSeconds = matchPlayerEnemyBlindTime(demo);
  const teamOf = (board: TeamScoreboard): TeamPlayerStats => ({
    team: board.team,
    score: board.score,
    players: board.players.map((totals) =>
      rowOf(
        totals,
        tallyOf(totals.slot),
        utilityDamage.get(totals.slot) ?? 0,
        blindSeconds.get(totals.slot) ?? 0,
      ),
    ),
  });

  return [teamOf(boards[0]), teamOf(boards[1])];
}
