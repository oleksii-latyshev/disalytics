import type { ParsedDemo, PlayerSlot, Round, Team } from '../schema';
import { openingDuels } from './duels';
import { REGULATION_ROUNDS_PER_HALF } from './economy-rules';
import { oppositeSide } from './round-sides';
import { type OpeningSide, roundWinners } from './score';

/**
 * One reading as a count over a base: `hits` of `rounds`. What a hit is differs per figure and is
 * stated where the figure is declared. A base of zero is **unknown**, never a rate of zero — the
 * reader of a tally decides what to show when `rounds` is 0.
 */
export interface Tally {
  rounds: number;
  hits: number;
}

/** A tally for each side the team played, which is how every team-level reading is split. */
export type SideTally = Record<Team, Tally>;

/** The buy a team made as a whole, from what its players bought. */
export type TeamBuy = 'eco' | 'force' | 'full';

export const TEAM_BUYS: readonly TeamBuy[] = ['eco', 'force', 'full'];

/** What a round's buy was for a team: a pistol round, one of the three buys, or no majority. */
export type TeamBuyClass = TeamBuy | 'pistol' | 'mixed';

export interface TeamRoundStats {
  readonly team: OpeningSide;
  /** Rounds played and won, draws excluded. */
  readonly rounds: SideTally;
  /** Pistol rounds: round 1 and round 13 only — overtime has none. `hits` are rounds won. */
  readonly pistol: SideTally;
  /** Rounds won, by the team's own buy. Pistol rounds are not in any of these. */
  readonly buy: Readonly<Record<TeamBuy, SideTally>>;
  /** Non-pistol rounds where no buy had a majority of the team's players. `hits` are rounds won. */
  readonly mixedBuy: SideTally;
  /** A full buy against an opposing eco: `rounds` is those rounds, `hits` the ones **lost**. */
  readonly antiEco: SideTally;
  /** `rounds` is rounds this team took the first opponent kill in; `hits` the ones it then won. */
  readonly firstKillGot: SideTally;
  /** `rounds` is rounds this team conceded the first opponent kill in; `hits` the ones it won. */
  readonly firstKillConceded: SideTally;
  /** Five alive against four after the round's first death; `hits` are rounds won. */
  readonly fiveVsFour: SideTally;
  /** Four alive against five after the round's first death; `hits` are rounds won. */
  readonly fourVsFive: SideTally;
  readonly bomb: {
    /** T rounds played; `hits` are the rounds the bomb was planted in. */
    readonly plants: Tally;
    /** T rounds with a plant; `hits` are the ones won. */
    readonly postPlant: Tally;
    /** CT rounds facing a plant; `hits` are the ones won — a retake. */
    readonly retakes: Tally;
  };
}

const PISTOL_ROUNDS: readonly number[] = [1, REGULATION_ROUNDS_PER_HALF + 1];
const TEAM_SIZE = 5;

function emptyTally(): Tally {
  return { rounds: 0, hits: 0 };
}

function emptySideTally(): SideTally {
  return { CT: emptyTally(), T: emptyTally() };
}

function count(tally: SideTally, side: Team, hit: boolean): void {
  tally[side].rounds += 1;
  if (hit) tally[side].hits += 1;
}

function bump(tally: Tally, hit: boolean): void {
  tally.rounds += 1;
  if (hit) tally.hits += 1;
}

/** Whether a round is the first of a regulation half. Overtime halves open with a full buy. */
export function isPistolRound(round: Round): boolean {
  return PISTOL_ROUNDS.includes(round.number);
}

/**
 * The buy a side made as a team, read from the buy types the parser recorded for its players.
 *
 * - A **pistol round** is round 1 and round 13; overtime has none.
 * - Otherwise a player's `eco` is an eco, `force-buy` and `semi-buy` are a force, `full-buy` a full.
 *   The team's buy is the one **more than half** of its recorded players made; no majority is
 *   `mixed`, which is counted and shown as such rather than guessed into a bucket.
 * - `null` when no slot of that side was recorded, which is unknown rather than any buy.
 */
export function teamBuyClass(round: Round, side: Team): TeamBuyClass | null {
  const entries = round.economy.filter((entry) => entry.team === side);
  if (entries.length === 0) return null;
  if (isPistolRound(round)) return 'pistol';

  const counts: Record<TeamBuy, number> = { eco: 0, force: 0, full: 0 };
  for (const { buyType } of entries) {
    if (buyType === 'eco') counts.eco += 1;
    else if (buyType === 'force-buy' || buyType === 'semi-buy') counts.force += 1;
    else if (buyType === 'full-buy') counts.full += 1;
  }

  for (const buy of TEAM_BUYS) {
    if (counts[buy] * 2 > entries.length) return buy;
  }

  return 'mixed';
}

function planted(demo: ParsedDemo, round: Round): boolean {
  return demo.events.plants.some(
    (plant) => plant.tick >= round.startTick && plant.tick <= round.endTick,
  );
}

/**
 * Alive counts per side after the round's first death of any cause, or `null` when the round cannot
 * say: not five recorded per side, no death at all, or a victim no roster names.
 */
function aliveAfterFirstDeath(demo: ParsedDemo, round: Round): Record<Team, number> | null {
  const rosters: Record<Team, Set<PlayerSlot>> = { CT: new Set(), T: new Set() };
  for (const entry of round.economy) {
    if (entry.team !== null) rosters[entry.team].add(entry.slot);
  }
  if (rosters.CT.size !== TEAM_SIZE || rosters.T.size !== TEAM_SIZE) return null;

  for (const kill of demo.events.kills) {
    if (kill.tick < round.startTick) continue;
    if (kill.tick > round.endTick) break;

    for (const side of ['CT', 'T'] as const) {
      if (rosters[side].has(kill.victim)) {
        const alive = { CT: TEAM_SIZE, T: TEAM_SIZE };
        alive[side] -= 1;
        return alive;
      }
    }
    return null;
  }

  return null;
}

interface RoundContext {
  readonly sideOf: Record<OpeningSide, Team>;
  readonly planted: boolean;
  readonly alive: Record<Team, number> | null;
  readonly opener: Team | undefined;
  readonly classes: Record<Team, TeamBuyClass | null>;
}

function tallyBuys(stats: TeamRoundStats, side: Team, won: boolean, context: RoundContext): void {
  const own = context.classes[side];
  const opposing = context.classes[oppositeSide(side)];

  if (own === 'pistol') count(stats.pistol, side, won);
  else if (own === 'mixed') count(stats.mixedBuy, side, won);
  else if (own !== null) count(stats.buy[own], side, won);

  if (own === 'full' && opposing === 'eco') count(stats.antiEco, side, !won);
}

function tallyKills(stats: TeamRoundStats, side: Team, won: boolean, context: RoundContext): void {
  const { alive, opener } = context;

  if (opener !== undefined) {
    count(opener === side ? stats.firstKillGot : stats.firstKillConceded, side, won);
  }

  if (alive === null) return;

  const own = alive[side];
  const opposing = alive[oppositeSide(side)];
  if (own > opposing) count(stats.fiveVsFour, side, won);
  else if (own < opposing) count(stats.fourVsFive, side, won);
}

function tallyBomb(stats: TeamRoundStats, side: Team, won: boolean, context: RoundContext): void {
  if (side === 'T') {
    bump(stats.bomb.plants, context.planted);
    if (context.planted) bump(stats.bomb.postPlant, won);
  } else if (context.planted) {
    bump(stats.bomb.retakes, won);
  }
}

function newTeamStats(team: OpeningSide): TeamRoundStats {
  return {
    team,
    rounds: emptySideTally(),
    pistol: emptySideTally(),
    buy: { eco: emptySideTally(), force: emptySideTally(), full: emptySideTally() },
    mixedBuy: emptySideTally(),
    antiEco: emptySideTally(),
    firstKillGot: emptySideTally(),
    firstKillConceded: emptySideTally(),
    fiveVsFour: emptySideTally(),
    fourVsFive: emptySideTally(),
    bomb: { plants: emptyTally(), postPlant: emptyTally(), retakes: emptyTally() },
  };
}

/**
 * How each team converts its rounds — pistols, buys, the first kill, man advantage and the bomb —
 * both teams named by the side they opened on, every figure split by the side played that round.
 *
 * Every figure is a tally over the rounds that can answer it, so a round whose economy, kills or
 * winner the demo does not carry is left out of the base instead of being counted as a loss.
 * **Draws are left out of every count**: nobody won them. The per-side tallies of a figure add up to
 * its total by construction, and `rounds` over both sides equals the decided rounds.
 */
export function teamRoundStats(demo: ParsedDemo): readonly TeamRoundStats[] {
  const winners = roundWinners(demo);
  const openers = new Map<number, Team>();
  for (const duel of openingDuels(demo)) {
    if (duel.attackerSide !== undefined) openers.set(duel.roundIndex, duel.attackerSide);
  }

  const teams = [newTeamStats('ct'), newTeamStats('t')];

  for (const [index, round] of demo.events.rounds.entries()) {
    const winnerTeam = winners[index];
    if (round.reason === 'draw' || winnerTeam === undefined) continue;

    const loser = oppositeSide(round.winner);
    const context: RoundContext = {
      sideOf: winnerTeam === 'ct' ? { ct: round.winner, t: loser } : { t: round.winner, ct: loser },
      planted: planted(demo, round),
      alive: aliveAfterFirstDeath(demo, round),
      opener: openers.get(index),
      classes: { CT: teamBuyClass(round, 'CT'), T: teamBuyClass(round, 'T') },
    };

    for (const stats of teams) {
      const side = context.sideOf[stats.team];
      const won = round.winner === side;

      count(stats.rounds, side, won);
      tallyBuys(stats, side, won, context);
      tallyKills(stats, side, won, context);
      tallyBomb(stats, side, won, context);
    }
  }

  return teams;
}
