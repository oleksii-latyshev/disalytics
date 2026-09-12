import type { Frame, Grenade, ParsedDemo, Team, WorldPoint } from '../schema';
import { frameForTick, sidesBySlotAtRound } from './selectors';

/**
 * One grenade as a thing with two places on the map — where it was thrown from and where it went
 * off — rather than as a mark that arrives and fades while the match plays.
 *
 * It carries the *frame* of the throw rather than the tick, because the thrower's own position lives
 * in `TickTrack` and is read at the moment the grenade left their hand. The landing needs no frame:
 * `Grenade.detonationPosition` is a world point the recording states outright.
 *
 * The side is the one that slot held **that round**. `PlayerInfo.team` is the end-of-match roster
 * and names the wrong side for every round before the swap, which over a whole match is half of
 * them.
 */
export interface UtilityThrow {
  /** The round it happened in, which is the axis a reading of the whole match narrows by. */
  readonly roundIndex: number;
  /** The grenade itself — its type, its thrower and the flight it took are all read off it. */
  readonly grenade: Grenade;
  readonly throwerSide: Team | undefined;
  /** The frame the grenade was thrown on, which is where the thrower's own position is read. */
  readonly frame: Frame;
  /** `Grenade.detonationPosition`, narrowed: a throw with nowhere to land is not one of these. */
  readonly landing: WorldPoint;
}

/**
 * Every grenade in the match that has somewhere to land, oldest first.
 *
 * **A grenade that never went off is left out**, and that is the one omission: the round was cleaned
 * up around it, so it has no `detonationPosition` and no point on the map to draw a landing at.
 * Measured over the two shipped samples, that is **3 of 526** on dust2 and **2 of 382** on inferno —
 * `matchDuels` leaves out a kill by the world for the same reason and states it the same way.
 *
 * The window is the round's own `[startTick, endTick]`, which is where the feed and the round axis
 * draw utility too. Rounds and grenades are both sorted by tick, so this walks each list once and
 * resolves the sides once per round.
 */
export function matchUtility(demo: ParsedDemo): readonly UtilityThrow[] {
  const { grenades, rounds } = demo.events;
  const throws: UtilityThrow[] = [];
  let first = 0;

  for (const [roundIndex, round] of rounds.entries()) {
    while (first < grenades.length && (grenades[first]?.throwTick ?? 0) < round.startTick) {
      first += 1;
    }

    const sides = sidesBySlotAtRound(demo, roundIndex);

    for (let index = first; index < grenades.length; index++) {
      const grenade = grenades[index];
      if (grenade === undefined || grenade.throwTick > round.endTick) break;

      const { detonationPosition } = grenade;
      if (detonationPosition === null) continue;

      throws.push({
        roundIndex,
        grenade,
        throwerSide: sides[grenade.thrower],
        frame: frameForTick(demo.track, grenade.throwTick),
        landing: detonationPosition,
      });
    }
  }

  return throws;
}
