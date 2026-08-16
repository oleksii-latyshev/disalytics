import {
  frameForTick,
  lastFrame,
  type ParsedDemo,
  type PlayerInfo,
  type Team,
} from '@disa/demo-core';

/**
 * The ribbon's height — `docs/DESIGN.md` §7.3. The block that lays the ribbon out and the layer
 * that fits an economy block inside it both need it, so it is one number rather than a CSS height
 * beside a canvas constant that agrees with it by hand.
 *
 * The previous revision's spine was 96px and carried kill marks and a scrubber. This is the same
 * data re-scaled to a navigation strip: the marks moved up to the round timeline, where they fit.
 */
export const RIBBON_HEIGHT_PX = 14;

/**
 * How far an economy block may leave the ribbon's centre line — §7.3's 4px band. Bounded rather
 * than proportional: at 14px a proportional reach would swallow the strip.
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
