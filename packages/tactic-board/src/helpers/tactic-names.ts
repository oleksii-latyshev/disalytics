import { TACTIC_ROUNDS, type TacticRound } from '@disa/demo-core';

/** A name the user left empty reads as the screen's own wording instead of a stored English string. */
export function nameOrFallback(name: string, fallback: string): string {
  return name.trim() === '' ? fallback : name;
}

/** The round types in the order the editor offers them, or nothing when any round will do. */
export function calledOnRounds(rounds: readonly TacticRound[] | undefined): string | undefined {
  const picked = TACTIC_ROUNDS.filter((round) => rounds?.includes(round) === true);
  return picked.length === 0 ? undefined : picked.join(', ');
}
