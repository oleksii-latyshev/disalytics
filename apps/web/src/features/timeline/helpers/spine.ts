import {
  frameForTick,
  lastFrame,
  type ParsedDemo,
  type PlayerInfo,
  type Team,
} from '@disa/demo-core';

/**
 * How far an economy block may leave the chart's centre line — a bounded reach rather than a
 * proportional one, so a strip of any height keeps the gap legible against the round bands.
 */
export const ECONOMY_REACH_PX = 4;

export interface RoundBand {
  readonly round: number;
  readonly winner: Team;
  /** Where the round opens and closes, as fractions of the match in [0, 1]. */
  readonly startFraction: number;
  readonly endFraction: number;
}

/** One band per round, carrying the side that won it. A demo with no samples has nothing to place. */
export function roundBands(demo: ParsedDemo): readonly RoundBand[] {
  const end = lastFrame(demo.track);
  if (end === 0) return [];

  return demo.events.rounds.map((round) => ({
    round: round.number,
    winner: round.winner,
    startFraction: frameForTick(demo.track, round.startTick) / end,
    endFraction: frameForTick(demo.track, round.endTick) / end,
  }));
}

/** Names indexed by the slot they occupy, so labelling a glyph never searches the roster. */
export function namesBySlot(players: readonly PlayerInfo[]): readonly (string | undefined)[] {
  const names: (string | undefined)[] = [];

  for (const player of players) names[player.slot] = player.name;

  return names;
}
