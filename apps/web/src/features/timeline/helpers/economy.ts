import { frameForTick, lastFrame, type ParsedDemo, type Round, type Team } from '@disa/demo-core';

/** What one round's buy looked like, as the distance between the two sides rather than two totals. */
export interface EconomyStep {
  readonly round: number;
  /** Where the round opens and closes, as fractions of the match in [0, 1]. */
  readonly startFraction: number;
  readonly endFraction: number;
  /** The side that came out of freeze time better equipped, or `null` when neither did. */
  readonly leader: Team | null;
  /** How much better, in the game's own dollars. */
  readonly difference: number;
  /** `difference` against the widest gap the match holds, in [0, 1]. */
  readonly share: number;
}

/**
 * Equipment on each side at freeze-time end. The side comes from the round's own economy rather
 * than from `PlayerInfo.team`, which reads the end of the match and so has the halves swapped for
 * everything before the break.
 */
function totalsFor(round: Round): Readonly<Record<Team, number>> {
  const totals: Record<Team, number> = { CT: 0, T: 0 };

  for (const entry of round.economy) {
    if (entry.team === null) continue;

    totals[entry.team] += entry.equipmentValue;
  }

  return totals;
}

/**
 * Derived once per demo, like every other series the spine draws: the rounds are walked here so
 * that nothing has to walk them in a draw.
 */
export function economySteps(demo: ParsedDemo): readonly EconomyStep[] {
  const end = lastFrame(demo.track);
  if (end === 0) return [];

  const gaps = demo.events.rounds.map((round) => {
    const totals = totalsFor(round);

    return { round, gap: totals.CT - totals.T };
  });

  const widest = gaps.reduce((peak, entry) => Math.max(peak, Math.abs(entry.gap)), 0);

  return gaps.map(({ round, gap }) => ({
    round: round.number,
    startFraction: frameForTick(demo.track, round.startTick) / end,
    endFraction: frameForTick(demo.track, round.endTick) / end,
    leader: gap === 0 ? null : gap > 0 ? 'CT' : 'T',
    difference: Math.abs(gap),
    share: widest === 0 ? 0 : Math.abs(gap) / widest,
  }));
}
