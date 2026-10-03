import type { Team } from '../schema';
import { OVERTIME_ROUNDS_PER_HALF, REGULATION_ROUNDS_PER_HALF } from './economy-rules';

export function oppositeSide(side: Team): Team {
  return side === 'CT' ? 'T' : 'CT';
}

export function sideAtRound(openingSide: Team, round: number): Team {
  if (round <= REGULATION_ROUNDS_PER_HALF) return openingSide;
  const regulationRounds = REGULATION_ROUNDS_PER_HALF * 2;
  const switches =
    1 + Math.floor(Math.max(0, round - regulationRounds - 1) / OVERTIME_ROUNDS_PER_HALF);
  return switches % 2 === 0 ? openingSide : oppositeSide(openingSide);
}
