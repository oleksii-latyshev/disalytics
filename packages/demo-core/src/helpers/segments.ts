import type { ParsedDemo, PlayerSlot, Round, Team } from '../schema';

/** A run of consecutive rounds played with the sides the way round `startIndex` had them. */
export interface MatchSegment {
  /** Index into `demo.events.rounds` of the first round in the segment. */
  readonly startIndex: number;
  /** Index of the last round, inclusive. A one-round segment has both the same. */
  readonly endIndex: number;
}

function sidesOf(round: Round): Map<PlayerSlot, Team> {
  const sides = new Map<PlayerSlot, Team>();

  for (const entry of round.economy) {
    if (entry.team !== null) sides.set(entry.slot, entry.team);
  }

  return sides;
}

/**
 * Whether the sides swapped between two rounds.
 *
 * By majority of what is comparable rather than by any single slot: a player who disconnects,
 * reconnects, or has no sample at freeze-time end appears on one side of the comparison and not the
 * other, and a rule that keyed on one slot would call that a halftime. Only slots both rounds
 * recorded a side for are compared, and a tie is not a swap — a two-slot comparison that splits is
 * evidence of a substitution, not of a half ending.
 */
function hasSwapped(before: Map<PlayerSlot, Team>, after: Map<PlayerSlot, Team>): boolean {
  let compared = 0;
  let changed = 0;

  for (const [slot, team] of before) {
    const now = after.get(slot);
    if (now === undefined) continue;

    compared += 1;
    if (now !== team) changed += 1;
  }

  return changed * 2 > compared;
}

/**
 * The match's own structure — `docs/DESIGN.md` §7.3's dividers. Halves and overtimes, derived from
 * the rounds rather than assumed from their count.
 *
 * A boundary falls wherever the sides swap, which `Round.economy[].team` records for the round it
 * belongs to. That is the whole rule, and it is why nothing here knows what MR12 is: MR12, MR15, a
 * match that ends 13–3 and a match that runs three overtimes all produce the right dividers from
 * the same comparison. A round count would have to be told.
 *
 * Derived once per demo — the strip renders off it, never inside a draw.
 */
export function matchSegments(demo: ParsedDemo): readonly MatchSegment[] {
  const { rounds } = demo.events;
  const first = rounds.at(0);
  if (first === undefined) return [];

  const segments: MatchSegment[] = [];
  let startIndex = 0;
  let previous = sidesOf(first);

  for (let index = 1; index < rounds.length; index++) {
    const round = rounds.at(index);
    if (round === undefined) continue;

    const current = sidesOf(round);

    // An empty economy is not a swap and not a segment of its own: it carries no evidence either
    // way, so the run continues and the next round with a roster is compared against the last one
    // that had one.
    if (current.size === 0) continue;

    if (hasSwapped(previous, current)) {
      segments.push({ startIndex, endIndex: index - 1 });
      startIndex = index;
    }

    previous = current;
  }

  segments.push({ startIndex, endIndex: rounds.length - 1 });

  return segments;
}
