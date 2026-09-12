import {
  asTick,
  grenadeRadiusUnits,
  sampleAt,
  type TickTrack,
  trajectoryClipCount,
  type UtilityThrow,
} from '@disa/demo-core';
import { type MapOverview, RADAR_IMAGE_SIZE, radarX, radarY } from '@disa/map-data';
import { POSITION_STRIDE, positionScratch, readPositions } from '@/core/playback';
import type { Layer } from '@/core/renderer';
import type { RadarColors } from './colors';
import { drawTrajectory, grenadeColor } from './grenades';
import { levelIndexAt, OTHER_LEVEL_ALPHA } from './levels';
import { type PlateView, plateGeometry, readPlateGeometry } from './view';

/** Screen `x`, screen `y` and the level's opacity, per end. */
const END_STRIDE = 3;
/** Where it was thrown from first, where it went off second. */
const ENDS_LENGTH = END_STRIDE * 2;

const FULL_TURN = 2 * Math.PI;

/**
 * What a match's worth of marks keeps of one mark's own opacity — `duel-layer.ts`'s own number and
 * the same argument: §6.2's marks are drawn one at a time over a plate the reader is watching, and
 * a whole match of them at that strength is a ball of wool. A match's utility is three to four times
 * its duels — 526 grenades over 24 rounds on the dust2 sample against 144 kills — so the path is
 * taken down further than the two ends it joins.
 */
const MARK_ALPHA = 0.7;
const PATH_ALPHA = 0.12;

/** Where the player stood — smaller than the ground the grenade went on to cover. */
const ORIGIN_RADIUS_PX = 2.5;

/** And where it went off: the centre of the ground it took, inside a ring of that ground's extent. */
const LANDING_RADIUS_PX = 2;
const LANDING_RING_WIDTH_PX = 1;

/**
 * Where every throw's two ends fall on the radar image, computed once for a list of throws.
 *
 * The two ends come from two places and that is the point of the reading: the origin is the
 * *thrower's own position* at the frame the grenade left their hand, read from `TickTrack` the way a
 * duel's ends are read at the kill's own frame, and the landing is the world point the recording
 * states outright. The projectile's first sample was the other candidate for the origin and sits a
 * median 24.9 units away — measured over both shipped samples — which is the hand rather than the
 * feet, and both are sampled at the same 16 Hz.
 *
 * The draw then multiplies by the plate's scale, so resizing the screen re-reads nothing.
 */
export function throwPlot(
  track: TickTrack,
  overview: MapOverview,
  levelIndex: number,
  throws: readonly UtilityThrow[],
): Float32Array {
  const positions = positionScratch(track);
  const plot = new Float32Array(throws.length * ENDS_LENGTH);

  const levelAlpha = (z: number) =>
    levelIndexAt(overview, z) === levelIndex ? 1 : OTHER_LEVEL_ALPHA;

  throws.forEach((thrown, index) => {
    readPositions(track, thrown.frame, positions);

    const offset = thrown.grenade.thrower * POSITION_STRIDE;
    const at = index * ENDS_LENGTH;

    plot[at] = radarX(overview, sampleAt(positions, offset));
    plot[at + 1] = radarY(overview, sampleAt(positions, offset + 1));
    plot[at + 2] = levelAlpha(sampleAt(positions, offset + 2));
    plot[at + END_STRIDE] = radarX(overview, thrown.landing.x);
    plot[at + END_STRIDE + 1] = radarY(overview, thrown.landing.y);
    plot[at + END_STRIDE + 2] = levelAlpha(thrown.landing.z);
  });

  return plot;
}

function drawOrigin(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  alpha: number,
  color: string,
): void {
  context.globalAlpha = alpha;
  context.fillStyle = color;

  context.beginPath();
  context.arc(x, y, ORIGIN_RADIUS_PX, 0, FULL_TURN);
  context.fill();
}

/**
 * Where it went off, and how much ground that took.
 *
 * A ring at the grenade's own effective radius rather than §6.2's body: a cloud, a fire and a blast
 * are drawn on the plate as things standing in the world at a moment — arriving, depleting, fading —
 * and a whole match has no moment to draw them at. What survives that is the extent, which is the
 * same number the plate's own marks are built from, and a ring is what lets a hundred and fifty of
 * them overlap and still be counted.
 */
function drawLanding(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radiusPx: number,
  alpha: number,
  color: string,
): void {
  context.globalAlpha = alpha;
  context.fillStyle = color;

  context.beginPath();
  context.arc(x, y, LANDING_RADIUS_PX, 0, FULL_TURN);
  context.fill();

  if (radiusPx <= LANDING_RADIUS_PX) return;

  context.lineWidth = LANDING_RING_WIDTH_PX;
  context.strokeStyle = color;

  context.beginPath();
  context.arc(x, y, radiusPx, 0, FULL_TURN);
  context.stroke();
}

export interface ThrowLayerOptions {
  readonly throws: readonly UtilityThrow[];
  /** `throwPlot` of exactly those throws, in the same order. */
  readonly plot: Float32Array;
  readonly overview: MapOverview;
  readonly tickRate: number;
  readonly colors: RadarColors;
  /** Read at draw time, the way every layer on the plate reads it. */
  readonly view: { readonly current: PlateView };
}

/**
 * Every grenade the match threw at once: a dot where the player stood, the flight it actually took,
 * and a ring at the ground it covered where it went off — `ROADMAP.md` M5's utility map.
 *
 * **The path is the projectile's own trajectory and never a straight line between the two ends.** A
 * bullet crosses the ground it is drawn over, which is what lets #362 join a duel's ends with one
 * stroke; a grenade is thrown over a wall and around a corner, so a straight line would be a claim
 * about the path rather than a drawing of it. It is clipped one tick short of the detonation, which
 * is where the flight ends — a projectile stays sampled where it landed for as long as twenty-two
 * seconds afterwards (`docs/PARSER.md` §20), and those samples are 353 more line segments to the
 * same point on a smoke.
 *
 * **Nothing here is a function of time.** There is no clock on this screen, so the layer paints when
 * its throws change or the canvas is resized, and the positions it draws were resolved before it was
 * built. Nothing in the draw allocates.
 */
export function throwLayer(options: ThrowLayerOptions): Layer {
  const { throws, plot, overview, tickRate, colors, view } = options;
  const geometry = plateGeometry();

  return (context, size) => {
    if (throws.length === 0) return;

    readPlateGeometry(view.current, size, RADAR_IMAGE_SIZE, geometry);
    context.translate(geometry.offsetX, geometry.offsetY);

    const { scale } = geometry;

    for (const [index, thrown] of throws.entries()) {
      const { grenade } = thrown;
      const color = grenadeColor(grenade.type, colors);
      const base = index * ENDS_LENGTH;
      const originAlpha = sampleAt(plot, base + 2) * MARK_ALPHA;
      const landingAlpha = sampleAt(plot, base + END_STRIDE + 2) * MARK_ALPHA;

      // One tick short of the detonation is the flight: `trajectoryClipCount` answers with the whole
      // trajectory from the detonation onwards, by design, because that is what the plate draws once
      // a grenade has landed.
      const flight =
        grenade.detonationTick === null
          ? 0
          : trajectoryClipCount(grenade, asTick((grenade.detonationTick as number) - 1), tickRate);

      drawTrajectory(
        context,
        grenade.trajectory,
        flight,
        overview,
        scale,
        color,
        Math.min(originAlpha, landingAlpha) * PATH_ALPHA,
      );

      drawOrigin(
        context,
        sampleAt(plot, base) * scale,
        sampleAt(plot, base + 1) * scale,
        originAlpha,
        color,
      );

      drawLanding(
        context,
        sampleAt(plot, base + END_STRIDE) * scale,
        sampleAt(plot, base + END_STRIDE + 1) * scale,
        (grenadeRadiusUnits(grenade.type) / overview.scale) * scale,
        landingAlpha,
        color,
      );
    }
  };
}
