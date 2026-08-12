import {
  type Frame,
  frameForTick,
  lastFrame,
  type ParsedDemo,
  type PlayerInfo,
  type PlayerSlot,
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

/** The height of the kill markers' band on the round timeline, which is where they live now. */
export const MARKER_BAND_PX = 10;

export interface RoundBand {
  readonly round: number;
  readonly winner: Team;
  /** Where the round opens and closes, as fractions of the match in [0, 1]. */
  readonly startFraction: number;
  readonly endFraction: number;
}

export interface KillMarker {
  /** The kill's position in `events.kills`, which is what identifies a marker across renders. */
  readonly index: number;
  readonly frame: Frame;
  readonly fraction: number;
  readonly attacker: PlayerSlot | null;
  readonly victim: PlayerSlot;
}

/** Where the playhead sits along a strip of `widthPx`, for a clock standing at `frame`. */
export function positionOnSpine(frame: number, end: number, widthPx: number): number {
  if (end <= 0) return 0;

  const fraction = frame / end;

  return (fraction < 0 ? 0 : fraction > 1 ? 1 : fraction) * widthPx;
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

/** One marker per kill, at the sample the kill lands on. */
export function killMarkers(demo: ParsedDemo): readonly KillMarker[] {
  const end = lastFrame(demo.track);
  if (end === 0) return [];

  return demo.events.kills.map((kill, index) => {
    const frame = frameForTick(demo.track, kill.tick);

    return {
      index,
      frame,
      fraction: frame / end,
      attacker: kill.attacker,
      victim: kill.victim,
    };
  });
}

/** Names indexed by the slot they occupy, so labelling a marker never searches the roster. */
export function namesBySlot(players: readonly PlayerInfo[]): readonly (string | undefined)[] {
  const names: (string | undefined)[] = [];

  for (const player of players) names[player.slot] = player.name;

  return names;
}
