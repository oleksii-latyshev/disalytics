import {
  type Clock,
  FLAG_ALIVE,
  FLAG_SCOPED,
  type PlayerSlot,
  sampleAt,
  type Team,
  type TickTrack,
} from '@disa/demo-core';
import { type MapOverview, RADAR_IMAGE_SIZE, radarX, radarY } from '@disa/map-data';
import { POSITION_STRIDE, positionScratch, readPositions } from '@/core/playback';
import type { CanvasSize, Layer } from '@/core/renderer';
import type { RadarColors } from './colors';
import {
  LABEL_CHIP_HEIGHT_PX,
  LABEL_CHIP_PADDING_X_PX,
  type LabelStyle,
  labelPlacer,
} from './labels';
import { levelIndexAt } from './levels';
import { drawNeedle, drawToken, screenAngle, TOKEN_RADIUS_PX } from './tokens';

const VISION_ALPHA = 0.15;
const VISION_FADE_UNITS = 1000;
/** The game's default field of view, so the wedge stands for what the player can actually see. */
const VISION_HALF_ANGLE = Math.PI / 4;

/** A player standing on a level the map is not currently showing, seen through the floor. */
const OTHER_LEVEL_ALPHA = 0.25;

export function radarBackdrop(image: HTMLImageElement): Layer {
  return (context, size) => {
    context.drawImage(image, 0, 0, size.width, size.height);
  };
}

export interface PlayerTokensOptions {
  readonly track: TickTrack;
  readonly clock: Clock;
  readonly overview: MapOverview;
  readonly levelIndex: number;
  readonly teamBySlot: readonly (Team | undefined)[];
  readonly labelBySlot: readonly string[];
  readonly selectedSlot: PlayerSlot | null;
  readonly colors: RadarColors;
  readonly labelStyle: LabelStyle;
}

/**
 * The clock is read at draw time rather than captured as a frame, which is what lets the rAF loop
 * repaint without rebuilding the layer — and so without allocating — every animation frame.
 */
export function playerTokens(options: PlayerTokensOptions): Layer {
  const { track, clock, overview, levelIndex, teamBySlot, colors } = options;
  const { labelBySlot, selectedSlot, labelStyle } = options;

  const positions = positionScratch(track);
  const placer = labelPlacer(track.slotCount);
  const chipWidths = new Float32Array(track.slotCount);
  let areChipsMeasured = false;

  // One gradient serves every frame: it is created around the origin and painted under a
  // translation, so only its radius — which follows the canvas — can invalidate it.
  let vision: CanvasGradient | null = null;
  let visionRadius = 0;
  let visionColor = '';

  function visionFill(context: CanvasRenderingContext2D, radius: number, color: string) {
    if (vision === null || visionRadius !== radius || visionColor !== color) {
      const gradient = context.createRadialGradient(0, 0, 0, 0, 0, radius);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, 'transparent');

      vision = gradient;
      visionRadius = radius;
      visionColor = color;
    }

    return vision;
  }

  function measureChips(context: CanvasRenderingContext2D): void {
    context.font = labelStyle.font;

    for (let slot = 0; slot < track.slotCount; slot++) {
      const label = labelBySlot[slot];

      chipWidths[slot] =
        label === undefined || label === ''
          ? 0
          : context.measureText(label).width + 2 * LABEL_CHIP_PADDING_X_PX;
    }

    areChipsMeasured = true;
  }

  /**
   * The cone the selected player can see, drawn before every token so it tints the plate rather
   * than the players standing in it. One cone at a time is information; ten is a fog, which is what
   * the needles are for — DESIGN.md §7.
   */
  function drawVision(
    context: CanvasRenderingContext2D,
    base: number,
    pixelsPerRadarPixel: number,
  ): void {
    if (selectedSlot === null) return;

    const team = teamBySlot[selectedSlot];
    if (team === undefined) return;

    const sample = base + selectedSlot;
    if ((sampleAt(track.flags, sample) & FLAG_ALIVE) === 0) return;

    const offset = selectedSlot * POSITION_STRIDE;
    if (levelIndexAt(overview, sampleAt(positions, offset + 2)) !== levelIndex) return;

    const radius = (VISION_FADE_UNITS / overview.scale) * pixelsPerRadarPixel;
    if (radius <= 0) return;

    const angle = screenAngle(track, sample);

    context.save();
    context.translate(
      radarX(overview, sampleAt(positions, offset)) * pixelsPerRadarPixel,
      radarY(overview, sampleAt(positions, offset + 1)) * pixelsPerRadarPixel,
    );
    context.globalAlpha = VISION_ALPHA;
    context.fillStyle = visionFill(context, radius, colors.team[team]);

    context.beginPath();
    context.moveTo(0, 0);
    context.arc(0, 0, radius, angle - VISION_HALF_ANGLE, angle + VISION_HALF_ANGLE);
    context.closePath();
    context.fill();

    context.restore();
  }

  function drawLabels(
    context: CanvasRenderingContext2D,
    size: CanvasSize,
    base: number,
    pixelsPerRadarPixel: number,
  ): void {
    context.font = labelStyle.font;
    context.textAlign = 'left';
    context.textBaseline = 'middle';
    placer.reset();

    for (let slot = 0; slot < track.slotCount; slot++) {
      if (teamBySlot[slot] === undefined) continue;
      if ((sampleAt(track.flags, base + slot) & FLAG_ALIVE) === 0) continue;

      const label = labelBySlot[slot];
      const width = sampleAt(chipWidths, slot);
      if (label === undefined || width === 0) continue;

      const offset = slot * POSITION_STRIDE;
      const x = radarX(overview, sampleAt(positions, offset)) * pixelsPerRadarPixel;
      const y = radarY(overview, sampleAt(positions, offset + 1)) * pixelsPerRadarPixel;
      const isOnShownLevel = levelIndexAt(overview, sampleAt(positions, offset + 2)) === levelIndex;

      placer.place(x, y, TOKEN_RADIUS_PX, width, size);

      context.globalAlpha = isOnShownLevel ? 1 : OTHER_LEVEL_ALPHA;
      context.fillStyle = colors.labelChip;
      context.beginPath();
      context.roundRect(placer.x, placer.y, width, LABEL_CHIP_HEIGHT_PX, labelStyle.chipRadius);
      context.fill();

      context.fillStyle = colors.labelInk;
      context.fillText(
        label,
        placer.x + LABEL_CHIP_PADDING_X_PX,
        placer.y + LABEL_CHIP_HEIGHT_PX / 2,
      );
    }
  }

  function drawTokens(
    context: CanvasRenderingContext2D,
    base: number,
    pixelsPerRadarPixel: number,
  ): void {
    for (let slot = 0; slot < track.slotCount; slot++) {
      const team = teamBySlot[slot];
      if (team === undefined) continue;

      const sample = base + slot;
      const flags = sampleAt(track.flags, sample);
      const isAlive = (flags & FLAG_ALIVE) !== 0;

      const offset = slot * POSITION_STRIDE;
      const x = radarX(overview, sampleAt(positions, offset)) * pixelsPerRadarPixel;
      const y = radarY(overview, sampleAt(positions, offset + 1)) * pixelsPerRadarPixel;
      const isOnShownLevel = levelIndexAt(overview, sampleAt(positions, offset + 2)) === levelIndex;

      context.globalAlpha = isOnShownLevel ? 1 : OTHER_LEVEL_ALPHA;

      if (isAlive) {
        drawNeedle(
          context,
          x,
          y,
          screenAngle(track, sample),
          (flags & FLAG_SCOPED) !== 0,
          colors.team[team],
        );
      }

      drawToken(context, x, y, team, isAlive ? colors.team[team] : colors.dead, colors.outline);
    }
  }

  return (context, size) => {
    if (track.frameCount === 0) return;

    const frame = readPositions(track, clock.frame, positions);
    const pixelsPerRadarPixel = size.width / RADAR_IMAGE_SIZE;
    const base = frame * track.slotCount;

    if (!areChipsMeasured) measureChips(context);

    drawVision(context, base, pixelsPerRadarPixel);
    drawTokens(context, base, pixelsPerRadarPixel);
    drawLabels(context, size, base, pixelsPerRadarPixel);
  };
}
