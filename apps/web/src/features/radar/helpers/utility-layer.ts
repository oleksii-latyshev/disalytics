import {
  type Clock,
  createVisualScratch,
  type Grenade,
  type GrenadeVisualScratch,
  grenadeRadiusUnits,
  grenadeVisual,
  type ParsedDemo,
  type PlayerSlot,
  sampleAt,
  type Tick,
  tickAtFrame,
  trajectoryClipCount,
  utilityKindOfGrenade,
  visibleGrenades,
} from '@disa/demo-core';
import { type MapOverview, RADAR_IMAGE_SIZE, radarX, radarY } from '@disa/map-data';
import type { Layer } from '@/core/renderer';
import type { TrajectoryVisibility } from '@/core/settings';
import type { RadarColors } from './colors';
import { drawGrenadeMark } from './equipment-marks';
import {
  drawDecoyPulse,
  drawFlashMark,
  drawHeRing,
  drawTrajectory,
  grenadeColor,
  isTrajectoryDrawn,
} from './grenades';
import {
  bodyParts,
  countdownLabels,
  drawFireBody,
  drawRemainingSeconds,
  drawSmokeBody,
  resolveCountdownFont,
} from './utility-body';
import { type PlateView, plateGeometry, readPlateGeometry } from './view';

export interface UtilityLayerOptions {
  readonly demo: ParsedDemo;
  readonly clock: Clock;
  readonly overview: MapOverview;
  readonly colors: RadarColors;
  readonly trajectories: TrajectoryVisibility;
  readonly selectedSlot: PlayerSlot | null;
  /**
   * The grenade §5.4's feed is pointing at, read at draw time for the reason the view is: a hover
   * repaints the layers that already exist rather than rebuilding them.
   */
  readonly hovered: { readonly current: number | null };
  /** Read at draw time, not captured — DESIGN.md §6.3's zoom is view state, never layer state. */
  readonly view: { readonly current: PlateView };
  /**
   * The letter a body's countdown is suffixed with, translated by the caller. A canvas cannot reach
   * the message catalogue and a draw may not build a string, so it arrives already made — the same
   * rule #278 wrote for a selected player's round.
   */
  readonly secondsUnit: string;
}

/**
 * Everything a grenade's draw needs beyond the grenade itself, so the three functions below take
 * four arguments rather than eleven. Allocated **once per demo** and rewritten in place: a literal
 * per grenade per frame is exactly the allocation `AGENTS.md` §9 keeps out of a draw.
 */
interface UtilityDraw {
  readonly overview: MapOverview;
  readonly colors: RadarColors;
  readonly trajectories: TrajectoryVisibility;
  readonly selectedSlot: PlayerSlot | null;
  readonly tickRate: number;
  /** The phase scratch, itself written in place by `grenadeVisual`. */
  readonly visual: GrenadeVisualScratch;
  /** Every grenade's body shape, laid out once per demo — a draw invents no geometry. */
  readonly parts: Float32Array;
  /** The countdown's face, resolved once for the reason the colours are: a draw reads no CSS. */
  readonly countdownFont: string;
  /** Every reading it can show, composed once so a draw allocates no string. */
  readonly countdownLabels: readonly string[];
  /** Rewritten once per frame. */
  tick: Tick;
  scale: number;
  /** Which grenade the feed is pointing at, or -1. Rewritten once per frame. */
  hovered: number;
  /** Rewritten once per grenade — where its detonation mark goes, and which grenade it is. */
  markX: number;
  markY: number;
  index: number;
}

/**
 * A projectile still in the air: the path it has taken, and the grenade itself at the head of it —
 * §6.2. The object obeys §10.5's trajectories row along with the line, because the two are one
 * drawing of one thing and a grenade with no path under it is a mark with no explanation.
 *
 * A row the feed is pointing at is the exception the setting does not answer for, the way
 * `drawHoveredPath` is once the same grenade has landed: the reader asked, so the path is drawn and
 * takes the utility's own colour to say which row asked.
 *
 * The head is the last sample the clip reaches, so the whole drawing is a function of `clock.frame`
 * and scrubbing backwards flies the grenade back to the hand that threw it.
 */
function drawFlight(context: CanvasRenderingContext2D, grenade: Grenade, draw: UtilityDraw): void {
  const isHovered = draw.index === draw.hovered;
  const clipCount =
    isHovered || isTrajectoryDrawn(draw.trajectories, grenade.thrower, draw.selectedSlot)
      ? trajectoryClipCount(grenade, draw.tick, draw.tickRate)
      : 0;

  if (clipCount < 1) return;

  drawTrajectory(
    context,
    grenade.trajectory,
    clipCount,
    draw.overview,
    draw.scale,
    isHovered ? grenadeColor(grenade.type, draw.colors) : draw.colors.trajectory,
  );

  const head = clipCount - 1;
  drawGrenadeMark(
    context,
    radarX(draw.overview, sampleAt(grenade.trajectory.x, head)) * draw.scale,
    radarY(draw.overview, sampleAt(grenade.trajectory.y, head)) * draw.scale,
    utilityKindOfGrenade(grenade.type),
    grenadeColor(grenade.type, draw.colors),
  );
}

/**
 * The path of the grenade the feed is pointing at, once it has landed — §5.4's other half, and the
 * grenade's answer to a kill row's line.
 *
 * Two things it does not do. It is **not gated on §10.5's trajectories row**, for the reason the
 * kill line is not: the reader asked this question of this row, the answer is one path, and it goes
 * when the pointer does. And it is **still clipped by `clock.frame`**, so a grenade caught in the
 * air draws only as far as it has flown — a hover may point something out, it may not show a reader
 * where a grenade is going to land before it lands.
 *
 * It is drawn in the utility's own colour rather than §6.2's white, because a plate mid-round can
 * hold several paths and the hue is what says this one is the row's.
 */
function drawHoveredPath(
  context: CanvasRenderingContext2D,
  grenade: Grenade,
  draw: UtilityDraw,
): void {
  const clipCount = trajectoryClipCount(grenade, draw.tick, draw.tickRate);
  if (clipCount < 1) return;

  drawTrajectory(
    context,
    grenade.trajectory,
    clipCount,
    draw.overview,
    draw.scale,
    grenadeColor(grenade.type, draw.colors),
  );
}

/**
 * The type dispatch, which is a separate decision from the phase dispatch above it and lives in its
 * own function for that reason. Exhaustive with no `default`, so a new `GrenadeType` is a compile
 * error rather than a detonation that draws nothing.
 */
function drawDetonation(
  context: CanvasRenderingContext2D,
  grenade: Grenade,
  draw: UtilityDraw,
): void {
  const { visual, markX, markY } = draw;
  const radiusPx = (grenadeRadiusUnits(grenade.type) / draw.overview.scale) * draw.scale;
  // One reading of the colour for both halves of a grenade's life — `grenadeColor` is where the
  // mark on the ground and the object in the air agree, rather than in two switches on one type.
  const color = grenadeColor(grenade.type, draw.colors);

  // A body is drawn at the extent it has reached rather than at its full radius: that is the whole
  // of "it arrives rather than appears", and it is a function of the tick like everything else here.
  const bodyPx = radiusPx * visual.extent;

  switch (grenade.type) {
    case 'smokegrenade':
      drawSmokeBody(context, markX, markY, bodyPx, visual.alpha, color, draw.parts, draw.index);
      drawCountdown(context, draw, bodyPx);
      break;

    case 'molotov':
    case 'incgrenade':
      drawFireBody(context, markX, markY, bodyPx, visual.alpha, color, draw.parts, draw.index);
      drawCountdown(context, draw, bodyPx);
      break;

    case 'hegrenade':
      drawHeRing(
        context,
        markX,
        markY,
        visual.progress,
        radiusPx,
        visual.phase === 'linger',
        color,
      );
      break;

    case 'flashbang':
      drawFlashMark(context, markX, markY, visual.progress, radiusPx, color);
      break;

    case 'decoy':
      drawDecoyPulse(context, markX, markY, visual.pulsePhase, color);
      break;
  }
}

/**
 * The seconds a body has left, over its own middle. Drawn after the body rather than under it.
 *
 * In the plate's own label ink rather than in the body's colour, which is what it was first built
 * with: a fire's digits in `--nade-molotov` over a fire read weakly next to a smoke's over a smoke,
 * and the two numbers are one reading and must not be two strengths. Nothing is lost by dropping
 * the hue — the number stands *inside* the body it belongs to, so its position already says whose
 * it is, and the colour is spent on being legible instead.
 */
function drawCountdown(context: CanvasRenderingContext2D, draw: UtilityDraw, bodyPx: number): void {
  drawRemainingSeconds(
    context,
    draw.markX,
    draw.markY,
    bodyPx,
    draw.visual.remainingSeconds,
    draw.countdownLabels,
    draw.colors.countdown,
    draw.colors.label.halo,
    draw.countdownFont,
  );
}

/** The phase dispatch: what a single visible grenade is doing at this tick, and what that draws. */
function drawGrenade(
  context: CanvasRenderingContext2D,
  grenade: Grenade,
  index: number,
  draw: UtilityDraw,
): void {
  const { visual } = draw;

  grenadeVisual(grenade, draw.tick, draw.tickRate, visual);
  if (visual.phase === null) return;

  draw.index = index;

  // In flight: the projectile and its path, no area.
  if (visual.phase === 'flight') {
    drawFlight(context, grenade, draw);
    return;
  }

  // Post-detonation visuals need a position.
  if (grenade.detonationPosition === null) return;

  // Under the area rather than over it: the path is how the utility got here, and the mark on the
  // ground is what the reader is being pointed at.
  if (index === draw.hovered) drawHoveredPath(context, grenade, draw);

  draw.markX = radarX(draw.overview, grenade.detonationPosition.x) * draw.scale;
  draw.markY = radarY(draw.overview, grenade.detonationPosition.y) * draw.scale;

  drawDetonation(context, grenade, draw);
}

/**
 * A `Layer` that paints grenade utility areas on the tactical plate — §6.2. Sits between the
 * backdrop and the player tokens in the draw order, so a smoke cloud is behind the players,
 * not on top of them.
 *
 * The clock is read at draw time. Scratch buffers are allocated once per demo and reused every
 * frame — no allocation in the draw loop.
 */
export function utilityLayer(options: UtilityLayerOptions): Layer {
  const { demo, clock, overview, colors, trajectories, selectedSlot, hovered, view } = options;
  const { events, track } = demo;
  const { grenades } = events;

  // Nothing to draw when there are no grenades.
  if (grenades.length === 0) {
    return () => {};
  }

  // Pre-allocated scratch — reused every frame.
  const visibleIndices = new Int32Array(grenades.length);
  const geometry = plateGeometry();
  const draw: UtilityDraw = {
    overview,
    colors,
    trajectories,
    selectedSlot,
    tickRate: track.tickRate,
    visual: createVisualScratch(),
    parts: bodyParts(grenades),
    countdownFont: resolveCountdownFont(),
    countdownLabels: countdownLabels(options.secondsUnit),
    tick: tickAtFrame(track, clock.frame),
    scale: 1,
    hovered: -1,
    markX: 0,
    markY: 0,
    index: 0,
  };

  return (context, size) => {
    readPlateGeometry(view.current, size, RADAR_IMAGE_SIZE, geometry);
    context.translate(geometry.offsetX, geometry.offsetY);

    draw.scale = geometry.scale;
    draw.tick = tickAtFrame(track, clock.frame);
    draw.hovered = hovered.current ?? -1;

    const count = visibleGrenades(grenades, draw.tick, track.tickRate, visibleIndices);

    for (let i = 0; i < count; i++) {
      const index = sampleAt(visibleIndices, i);
      const grenade = grenades[index];

      if (grenade !== undefined) drawGrenade(context, grenade, index, draw);
    }
  };
}
