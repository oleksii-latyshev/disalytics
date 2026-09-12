import type { Frame, ParsedDemo, PlayerSlot, Team } from '../schema';
import { frameForTick, sidesBySlotAtRound } from './selectors';

/**
 * One kill as a thing with two ends on the map, rather than as a line in a feed.
 *
 * It carries the *frame* rather than the tick, because the two positions it is drawn from live in
 * `TickTrack` and are read at the moment the kill happened — by the time anything looks at a match's
 * duels, both players have moved, and a line drawn to where they are now answers nothing.
 *
 * The sides are the ones those slots held **that round**. `PlayerInfo.team` is the end-of-match
 * roster and names the wrong side for every round before the swap, which over a whole match is
 * half of them.
 */
export interface Duel {
  /** The round it happened in, which is the axis a reading of the whole match narrows by. */
  readonly roundIndex: number;
  readonly frame: Frame;
  readonly attacker: PlayerSlot;
  readonly victim: PlayerSlot;
  readonly attackerSide: Team | undefined;
  readonly victimSide: Team | undefined;
}

/**
 * Every kill in the match that has two ends, oldest first.
 *
 * **A kill by the world is left out**, and that is the one omission: fall damage and the `kill`
 * command have no attacker, so there is no point on the map for the line to come from. Everything
 * else is kept, a suicide with a grenade included — its two ends are the same point, which is a
 * true drawing of what happened.
 *
 * The window is the round's own `[startTick, endTick]`, which is where `roundSurvivors` and the
 * feed draw it too: the post-round kills that follow most rounds are not part of the round and are
 * not part of its duels either.
 *
 * Rounds and kills are both sorted by tick, so this walks each list once rather than searching the
 * kills per round. The sides are resolved once per round for the same reason.
 */
export function matchDuels(demo: ParsedDemo): readonly Duel[] {
  const { kills, rounds } = demo.events;
  const duels: Duel[] = [];
  let first = 0;

  for (const [roundIndex, round] of rounds.entries()) {
    while (first < kills.length && (kills[first]?.tick ?? 0) < round.startTick) first += 1;

    const sides = sidesBySlotAtRound(demo, roundIndex);

    for (let index = first; index < kills.length; index++) {
      const kill = kills[index];
      if (kill === undefined || kill.tick > round.endTick) break;

      const { attacker } = kill;
      if (attacker === null) continue;

      duels.push({
        roundIndex,
        frame: frameForTick(demo.track, kill.tick),
        attacker,
        victim: kill.victim,
        attackerSide: sides[attacker],
        victimSide: sides[kill.victim],
      });
    }
  }

  return duels;
}
