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
  visibleGrenades,
} from '@disa/demo-core';
import { type MapOverview, RADAR_IMAGE_SIZE, radarX, radarY } from '@disa/map-data';
import type { Layer } from '@/core/renderer';
import type { TrajectoryVisibility } from '@/core/settings';
import type { RadarColors } from './colors';
import {
  drawDecoyPulse,
  drawFlashMark,
  drawHeRing,
  drawMolotovArea,
  drawSmokeCloud,
  drawTrajectory,
  isTrajectoryDrawn,
} from './grenades';
import { type PlateView, plateGeometry, readPlateGeometry } from './view';

export interface UtilityLayerOptions {
  readonly demo: ParsedDemo;
  readonly clock: Clock;
  readonly overview: MapOverview;
  readonly colors: RadarColors;
  readonly trajectories: TrajectoryVisibility;
  readonly selectedSlot: PlayerSlot | null;
  /** Read at draw time, not captured — DESIGN.md §6.3's zoom is view state, never layer state. */
  readonly view: { readonly current: PlateView };
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
  /** Rewritten once per frame. */
  tick: Tick;
  scale: number;
  /** Rewritten once per grenade — where its detonation mark goes, and which grenade it is. */
  markX: number;
  markY: number;
  index: number;
}

/** A projectile still in the air, for which §10.5 decides whether a trajectory is drawn at all. */
function drawFlight(context: CanvasRenderingContext2D, grenade: Grenade, draw: UtilityDraw): void {
  const clipCount = isTrajectoryDrawn(draw.trajectories, grenade.thrower, draw.selectedSlot)
    ? trajectoryClipCount(grenade, draw.tick, draw.tickRate)
    : 0;

  if (clipCount < 2) return;

  drawTrajectory(
    context,
    grenade.trajectory,
    clipCount,
    draw.overview,
    draw.scale,
    draw.colors.trajectory,
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
  const { visual, colors, markX, markY } = draw;
  const radiusPx = (grenadeRadiusUnits(grenade.type) / draw.overview.scale) * draw.scale;

  switch (grenade.type) {
    case 'smokegrenade':
      drawSmokeCloud(
        context,
        markX,
        markY,
        radiusPx,
        visual.alpha,
        visual.remaining,
        colors.nadeSmoke,
      );
      break;

    case 'molotov':
    case 'incgrenade':
      drawMolotovArea(
        context,
        markX,
        markY,
        radiusPx,
        visual.alpha,
        visual.remaining,
        colors.nadeMolotov,
        draw.index,
      );
      break;

    case 'hegrenade':
      drawHeRing(
        context,
        markX,
        markY,
        visual.progress,
        radiusPx,
        visual.phase === 'linger',
        colors.nadeHe,
      );
      break;

    case 'flashbang':
      drawFlashMark(context, markX, markY, visual.progress, colors.blind);
      break;

    case 'decoy':
      drawDecoyPulse(context, markX, markY, visual.pulsePhase, colors.nadeDecoy);
      break;
  }
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

  // In flight: only the trajectory, no area.
  if (visual.phase === 'flight') {
    drawFlight(context, grenade, draw);
    return;
  }

  // Post-detonation visuals need a position.
  if (grenade.detonationPosition === null) return;

  draw.markX = radarX(draw.overview, grenade.detonationPosition.x) * draw.scale;
  draw.markY = radarY(draw.overview, grenade.detonationPosition.y) * draw.scale;
  draw.index = index;

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
  const { demo, clock, overview, colors, trajectories, selectedSlot, view } = options;
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
    tick: tickAtFrame(track, clock.frame),
    scale: 1,
    markX: 0,
    markY: 0,
    index: 0,
  };

  return (context, size) => {
    readPlateGeometry(view.current, size, RADAR_IMAGE_SIZE, geometry);
    context.translate(geometry.offsetX, geometry.offsetY);

    draw.scale = geometry.scale;
    draw.tick = tickAtFrame(track, clock.frame);

    const count = visibleGrenades(grenades, draw.tick, track.tickRate, visibleIndices);

    for (let i = 0; i < count; i++) {
      const index = sampleAt(visibleIndices, i);
      const grenade = grenades[index];

      if (grenade !== undefined) drawGrenade(context, grenade, index, draw);
    }
  };
}
