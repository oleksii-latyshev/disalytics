import { type Clock, type ParsedDemo, sampleAt, type Team, type TickTrack } from '@disa/demo-core';
import { type MapOverview, RADAR_IMAGE_SIZE, radarX, radarY } from '@disa/map-data';
import type { KillLine } from '@/core/events';
import { POSITION_STRIDE, positionScratch, readPositions } from '@/core/playback';
import type { Layer } from '@/core/renderer';
import type { RadarColors } from './colors';
import { levelIndexAt, OTHER_LEVEL_ALPHA } from './levels';

/** Screen `x`, screen `y` and the level's opacity, per end. */
export const END_STRIDE = 3;
/** The attacker's end first, the victim's second. */
export const ENDS_LENGTH = END_STRIDE * 2;

const FULL_TURN = 2 * Math.PI;

/**
 * White rather than either side's colour, for §6.2's reason for a white trajectory: the line is not
 * the kill, it is the ground the kill crossed, and colouring it competes with the two ends that do
 * carry a side.
 */
const LINE_WIDTH_PX = 1.5;
const LINE_ALPHA = 0.45;

/** The shot came from here: a ring, because nothing on the plate stands at this point any more. */
const ORIGIN_RADIUS_PX = 4;
const ORIGIN_WIDTH_PX = 1.5;

/** And this is where they fell — smaller than a body, which is 4px and `--ink-faint` (§6.1). */
const FALL_RADIUS_PX = 3;

/**
 * The three marks §5.4 settled on, each on its own so that a drawing which is not the plate —
 * §10.6's legend — draws the same ring, the same disc and the same line rather than a second
 * copy of them. The alpha is the caller's, because on the plate it carries the level the end is on.
 */
export function drawKillPath(
  context: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  fallX: number,
  fallY: number,
  alpha: number,
  color: string,
): void {
  context.globalAlpha = alpha * LINE_ALPHA;
  context.lineWidth = LINE_WIDTH_PX;
  context.strokeStyle = color;

  context.beginPath();
  context.moveTo(originX, originY);
  context.lineTo(fallX, fallY);
  context.stroke();
}

/** Where the shot came from. */
export function drawKillOrigin(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  alpha: number,
  color: string,
): void {
  context.globalAlpha = alpha;
  context.lineWidth = ORIGIN_WIDTH_PX;
  context.strokeStyle = color;

  context.beginPath();
  context.arc(x, y, ORIGIN_RADIUS_PX, 0, FULL_TURN);
  context.stroke();
}

/** And where they fell. */
export function drawKillFall(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  alpha: number,
  color: string,
): void {
  context.globalAlpha = alpha;
  context.fillStyle = color;

  context.beginPath();
  context.arc(x, y, FALL_RADIUS_PX, 0, FULL_TURN);
  context.fill();
}

export interface KillLineGeometry {
  /** The two ends, `ENDS_LENGTH` numbers, rewritten in place by `read`. */
  readonly ends: Float32Array;
  /** Projects the kill's two positions onto a plate `scale` wide. */
  read(kill: KillLine, scale: number): void;
}

/**
 * Where a kill's two ends land on the plate, at the kill's **own** frame rather than at the
 * playhead's. That is the whole point of the mark: by the time a row can be hovered the two players
 * have moved, and a line drawn to where they are now would answer a question nobody asked.
 *
 * It owns its scratch and rewrites it, so a draw that needs the ends allocates nothing to get them.
 */
export function killLineGeometry(
  track: TickTrack,
  overview: MapOverview,
  levelIndex: number,
): KillLineGeometry {
  const positions = positionScratch(track);
  const ends = new Float32Array(ENDS_LENGTH);

  function writeEnd(index: number, slot: number, scale: number): void {
    const offset = slot * POSITION_STRIDE;
    const target = index * END_STRIDE;

    ends[target] = radarX(overview, sampleAt(positions, offset)) * scale;
    ends[target + 1] = radarY(overview, sampleAt(positions, offset + 1)) * scale;
    ends[target + 2] =
      levelIndexAt(overview, sampleAt(positions, offset + 2)) === levelIndex
        ? 1
        : OTHER_LEVEL_ALPHA;
  }

  return {
    ends,
    read(kill, scale) {
      readPositions(track, kill.frame, positions);

      writeEnd(0, kill.attacker, scale);
      writeEnd(1, kill.victim, scale);
    },
  };
}

export interface KillLineLayerOptions {
  readonly demo: ParsedDemo;
  readonly clock: Clock;
  readonly overview: MapOverview;
  readonly levelIndex: number;
  readonly colors: RadarColors;
  /**
   * The hovered row, read at draw time. It is a box rather than a value so that hovering repaints
   * the plate instead of rebuilding every layer on it — a rebuilt token layer re-measures ten name
   * chips, which §6.1 does once per demo on purpose.
   */
  readonly hovered: { readonly current: KillLine | null };
}

/**
 * §5.4's other half: hovering a feed row draws that kill's line on the plate, so *where it happened*
 * is answered without leaving the feed. A ring where the shot came from, a disc where the player
 * fell, and a white line between them.
 *
 * It sits under the tokens for §6.2's reason — the plate's people are never covered by what the
 * plate says about them — and the two ends are drawn over the line so the sides read at a glance.
 *
 * Nothing here is a function of wall time. The geometry is re-read only when the hovered row or the
 * plate's width changes, and while no row is hovered the layer returns before it touches anything.
 */
export function killLineLayer(options: KillLineLayerOptions): Layer {
  const { demo, clock, overview, levelIndex, colors, hovered } = options;
  const { track } = demo;

  const geometry = killLineGeometry(track, overview, levelIndex);
  const { ends } = geometry;

  let lastKill: KillLine | null = null;
  let lastScale = 0;

  const sideColor = (side: Team | undefined) =>
    side === undefined ? colors.dead : colors.team[side];

  return (context, size) => {
    if (track.frameCount === 0) return;

    const kill = hovered.current;
    if (kill === null) return;

    // The feed lists only what has already happened, and the line obeys the same rule: scrubbing
    // back past the kill takes it away rather than drawing a shot out of the future.
    if (kill.frame > clock.frame) return;

    const scale = size.width / RADAR_IMAGE_SIZE;

    if (kill !== lastKill || scale !== lastScale) {
      geometry.read(kill, scale);
      lastKill = kill;
      lastScale = scale;
    }

    const originX = sampleAt(ends, 0);
    const originY = sampleAt(ends, 1);
    const originAlpha = sampleAt(ends, 2);
    const fallX = sampleAt(ends, END_STRIDE);
    const fallY = sampleAt(ends, END_STRIDE + 1);
    const fallAlpha = sampleAt(ends, END_STRIDE + 2);

    // A line crossing a floor the map is not showing is as faint as its fainter end.
    drawKillPath(
      context,
      originX,
      originY,
      fallX,
      fallY,
      Math.min(originAlpha, fallAlpha),
      colors.killLine,
    );

    drawKillOrigin(context, originX, originY, originAlpha, sideColor(kill.attackerSide));
    drawKillFall(context, fallX, fallY, fallAlpha, sideColor(kill.victimSide));
  };
}
