import type { ParsedDemo, PlayerSlot, Round, RoundWinReason, Team } from '../schema';
import { roundKillCounts } from './duels';
import { OVERTIME_ROUNDS_PER_HALF, REGULATION_ROUNDS_PER_HALF } from './economy-rules';
import { oppositeSide } from './round-sides';
import { type MatchScore, type OpeningSide, roundWinners } from './score';
import { type TeamBuyClass, teamBuyClass } from './team-stats';

const REGULATION_ROUNDS = REGULATION_ROUNDS_PER_HALF * 2;

/** One round as the match summary's history states it. */
export interface RoundSummary {
  readonly roundIndex: number;
  /** The round's own number, from 1. */
  readonly number: number;
  readonly reason: RoundWinReason;
  /** The team that won it, or `null` for a draw, which nobody won. */
  readonly winner: OpeningSide | null;
  /** The side the winning team held that round — the colour a win is drawn in. */
  readonly winnerSide: Team | null;
  /** What each team bought; `null` for a draw or a round whose economy the demo does not carry. */
  readonly buys: Readonly<Record<OpeningSide, TeamBuyClass | null>>;
  /** The player with the most opponent kills; the first to reach the count wins a tie. */
  readonly topKiller: { readonly slot: PlayerSlot; readonly kills: number } | null;
  /** The last round of a half, which the history leaves a gap after. */
  readonly endsHalf: boolean;
}

/** Rounds won in each half, by team. There is no overtime entry in a match that had none. */
export interface HalfScores {
  readonly first: MatchScore;
  readonly second: MatchScore;
  readonly overtime: MatchScore | null;
}

export interface MatchSummary {
  readonly rounds: readonly RoundSummary[];
  readonly score: MatchScore;
  readonly halves: HalfScores;
}

function endsHalf(number: number): boolean {
  if (number <= REGULATION_ROUNDS) return number % REGULATION_ROUNDS_PER_HALF === 0;
  return (number - REGULATION_ROUNDS) % OVERTIME_ROUNDS_PER_HALF === 0;
}

function buysOf(
  round: Round,
  winner: OpeningSide | null,
): Readonly<Record<OpeningSide, TeamBuyClass | null>> {
  if (winner === null) return { ct: null, t: null };

  const winnerSide = round.winner;
  const startedCtSide = winner === 'ct' ? winnerSide : oppositeSide(winnerSide);

  return {
    ct: teamBuyClass(round, startedCtSide),
    t: teamBuyClass(round, oppositeSide(startedCtSide)),
  };
}

function topKillers(demo: ParsedDemo): ReadonlyMap<number, { slot: PlayerSlot; kills: number }> {
  const top = new Map<number, { slot: PlayerSlot; kills: number }>();

  for (const { roundIndex, player, kills } of roundKillCounts(demo)) {
    const current = top.get(roundIndex);
    if (current === undefined || kills > current.kills)
      top.set(roundIndex, { slot: player, kills });
  }

  return top;
}

interface Tally {
  startedCt: number;
  startedT: number;
}

function halfScoresOf(rounds: readonly RoundSummary[]): HalfScores {
  const first: Tally = { startedCt: 0, startedT: 0 };
  const second: Tally = { startedCt: 0, startedT: 0 };
  const overtime: Tally = { startedCt: 0, startedT: 0 };

  for (const { number, winner } of rounds) {
    if (winner === null) continue;

    const tally =
      number > REGULATION_ROUNDS ? overtime : number > REGULATION_ROUNDS_PER_HALF ? second : first;
    if (winner === 'ct') tally.startedCt += 1;
    else tally.startedT += 1;
  }

  const hasOvertime = rounds.some(({ number }) => number > REGULATION_ROUNDS);
  return { first, second, overtime: hasOvertime ? overtime : null };
}

/**
 * What the Stats view's match summary states, in one walk of the rounds: how each was won and by
 * whom, what both teams bought, who killed most, and the score in each half.
 *
 * Teams are named by the side they opened on, as everywhere (`roundWinners`). Halves are the two
 * regulation halves and the overtime that follows; a draw is nobody's round and counts for no team.
 */
export function matchSummary(demo: ParsedDemo): MatchSummary {
  const winners = roundWinners(demo);
  const killers = topKillers(demo);

  const rounds = demo.events.rounds.map((round, roundIndex): RoundSummary => {
    const winner = round.reason === 'draw' ? null : (winners[roundIndex] ?? null);

    return {
      roundIndex,
      number: round.number,
      reason: round.reason,
      winner,
      winnerSide: winner === null ? null : round.winner,
      buys: buysOf(round, winner),
      topKiller: killers.get(roundIndex) ?? null,
      endsHalf: endsHalf(round.number),
    };
  });

  const halves = halfScoresOf(rounds);
  const overtime = halves.overtime ?? { startedCt: 0, startedT: 0 };

  return {
    rounds,
    score: {
      startedCt: halves.first.startedCt + halves.second.startedCt + overtime.startedCt,
      startedT: halves.first.startedT + halves.second.startedT + overtime.startedT,
    },
    halves,
  };
}
