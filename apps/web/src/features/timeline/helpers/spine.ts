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
 * The height the strip's axis sits at. `docs/DESIGN.md` §5 divides the spine along it — event
 * density above, kill markers and the economy chart below — so the canvas and the markers over it
 * have to agree on one number.
 */
export const SPINE_AXIS_FRACTION = 0.6;

/**
 * The height of the kill markers' band, measured down from the axis. The economy chart begins where
 * it ends, so the number belongs to both of them and to neither alone.
 */
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
