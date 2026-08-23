import {
  frameForTick,
  lastFrame,
  type ParsedDemo,
  sidesBySlotAtRound,
  type Team,
  type Tick,
} from '@disa/demo-core';

export interface MatchKill {
  /** Where the kill sits in the match, in [0, 1] — the same denominator the round bands use. */
  readonly fraction: number;
  /**
   * The side of the player who **died**, which is §7.1's rule for tinting a kill and the reading
   * this chart is for: *who was dying, and when*. `undefined` for a kill no round covers — the
   * warm-up, and the seconds after a round is decided.
   */
  readonly side: Team | undefined;
}

interface RoundWindow {
  readonly startTick: Tick;
  readonly endTick: Tick;
  readonly sides: readonly (Team | undefined)[];
}

/**
 * Every kill in the match, placed and tinted — derived once per demo, the way every series this
 * chart draws is (#91). Nothing walks the match inside a draw.
 *
 * A kill outside every round still counts. The density trace beneath it counts all of them too, and
 * a chart that silently dropped the post-round kills would disagree with its own terrain; what a
 * round decides is the *side*, and where there is no round there is no side to name.
 */
export function matchKills(demo: ParsedDemo): readonly MatchKill[] {
  const end = lastFrame(demo.track);
  if (end === 0) return [];

  const windows: RoundWindow[] = demo.events.rounds.map((round, index) => ({
    startTick: round.startTick,
    endTick: round.endTick,
    sides: sidesBySlotAtRound(demo, index),
  }));

  return demo.events.kills.map((kill) => {
    const window = windows.find(
      (candidate) => kill.tick >= candidate.startTick && kill.tick <= candidate.endTick,
    );

    return {
      fraction: frameForTick(demo.track, kill.tick) / end,
      side: window === undefined ? undefined : window.sides[kill.victim],
    };
  });
}
