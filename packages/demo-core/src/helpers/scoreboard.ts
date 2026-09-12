import type { ParsedDemo, PlayerSlot, Round, Team } from '../schema';
import { matchScore, type OpeningSide, openingSideBySlot } from './score';
import { sidesBySlotAtRound } from './selectors';

/** What one player did over the whole match. Every figure a scoreboard row states is in here. */
export interface PlayerTotals {
  readonly slot: PlayerSlot;
  readonly kills: number;
  readonly assists: number;
  readonly deaths: number;
  /** Health damage dealt to opponents. Damage to a teammate is not a contribution to a round. */
  readonly damage: number;
  /** Kills that were headshots, which is the numerator of the share a row states. */
  readonly headshots: number;
  /** Rounds this slot was recorded on a side for — the denominator of damage per round. */
  readonly rounds: number;
}

/** One of the two teams, its score, and its players in the order a scoreboard lists them. */
export interface TeamScoreboard {
  readonly team: OpeningSide;
  readonly score: number;
  readonly players: readonly PlayerTotals[];
}

interface Tally {
  kills: number;
  assists: number;
  deaths: number;
  damage: number;
  headshots: number;
  rounds: number;
}

function newTally(): Tally {
  return { kills: 0, assists: 0, deaths: 0, damage: 0, headshots: 0, rounds: 0 };
}

/**
 * A row above another when it did more, and the tie broken by the slot so that two identical rows
 * keep the same order on every render and on every machine.
 */
function byContribution(first: PlayerTotals, second: PlayerTotals): number {
  return (
    second.kills - first.kills ||
    second.damage - first.damage ||
    (first.slot as number) - (second.slot as number)
  );
}

interface Walk {
  readonly demo: ParsedDemo;
  readonly tallies: Map<PlayerSlot, Tally>;
  /** Where the last round left off in each list, so the whole match is one pass over each. */
  nextKill: number;
  nextHit: number;
}

function tallyOf(walk: Walk, slot: PlayerSlot): Tally {
  const existing = walk.tallies.get(slot);
  if (existing !== undefined) return existing;

  const fresh = newTally();
  walk.tallies.set(slot, fresh);
  return fresh;
}

function countKills(walk: Walk, round: Round): void {
  const { kills } = walk.demo.events;

  while (walk.nextKill < kills.length && (kills[walk.nextKill]?.tick ?? 0) < round.startTick) {
    walk.nextKill += 1;
  }

  for (let index = walk.nextKill; index < kills.length; index++) {
    const kill = kills[index];
    if (kill === undefined || kill.tick > round.endTick) break;

    if (kill.attacker !== null) {
      const attacker = tallyOf(walk, kill.attacker);
      attacker.kills += 1;
      if (kill.isHeadshot) attacker.headshots += 1;
    }

    if (kill.assister !== null) tallyOf(walk, kill.assister).assists += 1;
    tallyOf(walk, kill.victim).deaths += 1;
  }
}

function countDamage(walk: Walk, round: Round, sides: readonly (Team | undefined)[]): void {
  const { damage } = walk.demo.events;

  while (walk.nextHit < damage.length && (damage[walk.nextHit]?.tick ?? 0) < round.startTick) {
    walk.nextHit += 1;
  }

  for (let index = walk.nextHit; index < damage.length; index++) {
    const hit = damage[index];
    if (hit === undefined || hit.tick > round.endTick) break;

    const { attacker } = hit;
    if (attacker === null || sides[attacker] === sides[hit.victim]) continue;

    tallyOf(walk, attacker).damage += hit.healthDamage;
  }
}

/**
 * Every player's match, counted once — `ROADMAP.md` M5's scoreboard.
 *
 * **The teams are named by the side they opened on**, which is the only name the demo gives a team
 * (`MatchScore`) and the same attribution `roundWinners` counts the score through, so a row and the
 * score above it cannot disagree about whose it is. Grouping by `PlayerInfo.team` instead puts half
 * a match under the wrong heading, which is #141 in another place.
 *
 * **Damage is health damage to opponents**, read against the sides *that round*: `playerRoundStats`
 * states the same rule for one round, and the halftime swap would otherwise call half a match's
 * damage friendly fire. Both shipped samples carry real teammate damage, so this is not theoretical.
 *
 * **A kill after the round ended is not in the match**, which is the window `matchDuels` and
 * `roundSurvivors` already use — 1 of 145 on the dust2 sample, 2 of 91 on inferno.
 *
 * Rounds, kills and damage are all sorted by tick, so this walks each list once for the whole match
 * rather than once per player per round.
 */
export function matchScoreboard(demo: ParsedDemo): readonly [TeamScoreboard, TeamScoreboard] {
  const walk: Walk = { demo, tallies: new Map(), nextKill: 0, nextHit: 0 };

  for (const [roundIndex, round] of demo.events.rounds.entries()) {
    for (const entry of round.economy) {
      if (entry.team !== null) tallyOf(walk, entry.slot).rounds += 1;
    }

    countKills(walk, round);
    countDamage(walk, round, sidesBySlotAtRound(demo, roundIndex));
  }

  const score = matchScore(demo);
  const teams = openingSideBySlot(demo);

  return [
    teamOf('ct', score.startedCt, demo, teams, walk.tallies),
    teamOf('t', score.startedT, demo, teams, walk.tallies),
  ];
}

function teamOf(
  team: OpeningSide,
  score: number,
  demo: ParsedDemo,
  teams: readonly (OpeningSide | undefined)[],
  tallies: ReadonlyMap<PlayerSlot, Tally>,
): TeamScoreboard {
  const players = demo.header.players
    .filter((player) => teams[player.slot] === team)
    .map((player) => ({ slot: player.slot, ...(tallies.get(player.slot) ?? newTally()) }))
    .sort(byContribution);

  return { team, score, players };
}
