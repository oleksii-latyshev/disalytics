import type { ParsedDemo, PlayerSlot, Round } from '../schema';

/**
 * A finished match's score, by **team** rather than by side.
 *
 * The demo carries no team name — `PlayerInfo` has a side, a SteamID and nothing that survives the
 * halftime swap — so the two teams are named by the side they started the match on. That is enough
 * to tell `13 : 7` from `7 : 13` and it never claims more than the data holds.
 */
export interface MatchScore {
  startedCt: number;
  startedT: number;
}

function ctSlotsOf(round: Round): readonly PlayerSlot[] {
  return round.economy.filter((slot) => slot.team === 'CT').map((slot) => slot.slot);
}

/** The slots that opened the match on CT — the identity every later round is measured against. */
function openingCtSlots(rounds: readonly Round[]): ReadonlySet<PlayerSlot> {
  for (const round of rounds) {
    const opening = ctSlotsOf(round);

    if (opening.length > 0) return new Set(opening);
  }

  return new Set();
}

/**
 * Whether the opening CT team is on CT for this round, or `null` when the round says nothing —
 * an empty economy, or every slot without a sample at freeze-time end. A player who joined after
 * the opening round belongs to neither set, so the majority decides rather than the first slot.
 */
function openingCtOnCt(round: Round, opening: ReadonlySet<PlayerSlot>): boolean | null {
  if (opening.size === 0) return null;

  let familiar = 0;
  let strange = 0;

  for (const slot of ctSlotsOf(round)) {
    if (opening.has(slot)) familiar += 1;
    else strange += 1;
  }

  if (familiar === strange) return null;

  return familiar > strange;
}

/**
 * `Round.winner` is a *side*, and a side belongs to a different team in each half, so counting
 * winners by side gives a pair of numbers that is neither team's score. Each round is attributed
 * through the side its own economy recorded — the only per-round side the schema carries.
 *
 * A round the mapping cannot be read from keeps the previous round's, which is what makes a match
 * with no economy data at all degrade to a side count rather than to nonsense.
 *
 * `throughRound` bounds the walk at a round index, which is the score *after* that round — what
 * §7.3's round list names on a hover. It is this function rather than `sideScoreAtFrame` because
 * that one counts `Round.winner` by side and reports neither team's score once the halves swap.
 */
export function matchScore(demo: ParsedDemo, throughRound?: number): MatchScore {
  const { rounds } = demo.events;
  const opening = openingCtSlots(rounds);
  const score: MatchScore = { startedCt: 0, startedT: 0 };
  let openingCtIsCt = true;

  for (const [index, round] of rounds.entries()) {
    if (throughRound !== undefined && index > throughRound) break;

    openingCtIsCt = openingCtOnCt(round, opening) ?? openingCtIsCt;

    const wonByOpeningCt = (round.winner === 'CT') === openingCtIsCt;

    if (wonByOpeningCt) score.startedCt += 1;
    else score.startedT += 1;
  }

  return score;
}
