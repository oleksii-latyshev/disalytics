import {
  asPlayerSlot,
  audibleRadiusAt,
  blindRemainingBySlot,
  bombProgressAt,
  type Clock,
  damageFlashBySlot,
  deathProgressBySlot,
  FLAG_ALIVE,
  FLAG_SCOPED,
  type ParsedDemo,
  type PlayerSlot,
  sampleAt,
  type Team,
} from '@disa/demo-core';
import { type MapOverview, RADAR_IMAGE_SIZE, radarX, radarY } from '@disa/map-data';
import { POSITION_STRIDE, positionScratch, readPositions } from '@/core/playback';
import type { CanvasSize, Layer } from '@/core/renderer';
import type { RadarColors } from './colors';
import { LABEL_HALO_PX, LABEL_HEIGHT_PX, type LabelStyle, labelPlacer } from './labels';
import { levelIndexAt } from './levels';
import {
  drawAudibleRing,
  drawBlindDisc,
  drawDamageFlash,
  drawNeedle,
  drawProgressArc,
  drawSelectionRing,
  drawToken,
  screenAngle,
  TOKEN_DEAD_RADIUS_PX,
  TOKEN_RADIUS_PX,
} from './tokens';

const VISION_ALPHA = 0.15;
const VISION_FADE_UNITS = 1000;
/** The game's default field of view, so the wedge stands for what the player can actually see. */
const VISION_HALF_ANGLE = Math.PI / 4;

/** A player standing on a level the map is not currently showing, seen through the floor. */
const OTHER_LEVEL_ALPHA = 0.25;

/** What a token has faded to once its player is a body — DESIGN.md §6.1. */
const DEAD_ALPHA = 0.5;

/** Screen `x`, screen `y` and the level's opacity, per slot. */
const SCREEN_STRIDE = 3;

export function radarBackdrop(image: HTMLImageElement): Layer {
  return (context, size) => {
    context.drawImage(image, 0, 0, size.width, size.height);
  };
}

export interface PlayerTokensOptions {
  readonly demo: ParsedDemo;
  readonly clock: Clock;
  readonly overview: MapOverview;
  readonly levelIndex: number;
  readonly teamBySlot: readonly (Team | undefined)[];
  readonly labelBySlot: readonly string[];
  readonly selectedSlot: PlayerSlot | null;
  readonly isAudibilityShown: boolean;
  readonly colors: RadarColors;
  readonly labelStyle: LabelStyle;
}

/**
 * The clock is read at draw time rather than captured as a frame, which is what lets the rAF loop
 * repaint without rebuilding the layer — and so without allocating — every animation frame.
 */
export function playerTokens(options: PlayerTokensOptions): Layer {
  const { demo, clock, overview, levelIndex, teamBySlot, colors } = options;
  const { labelBySlot, selectedSlot, isAudibilityShown, labelStyle } = options;
  const { track } = demo;

  const positions = positionScratch(track);
  const placer = labelPlacer(track.slotCount);
  const labelWidths = new Float32Array(track.slotCount);
  let areLabelsMeasured = false;

  // Everything a frame derives before it draws, owned by the layer for the same reason
  // `positionScratch` is: nothing on the way to the canvas allocates.
  const screen = new Float32Array(track.slotCount * SCREEN_STRIDE);
  const damageFlashes = new Float32Array(track.slotCount);
  const blindRemaining = new Float32Array(track.slotCount);
  const deathProgress = new Float32Array(track.slotCount);

  // The frame's own scalars, set once per draw and read by every pass below.
  let base = 0;
  let scale = 0;

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

  function measureLabels(context: CanvasRenderingContext2D): void {
    context.font = labelStyle.font;

    for (let slot = 0; slot < track.slotCount; slot++) {
      const label = labelBySlot[slot];

      labelWidths[slot] =
        label === undefined || label === ''
          ? 0
          : context.measureText(label).width + 2 * LABEL_HALO_PX;
    }

    areLabelsMeasured = true;
  }

  /** Turns this frame's interpolated positions into the screen coordinates every pass draws at. */
  function readScreen(): void {
    for (let slot = 0; slot < track.slotCount; slot++) {
      const offset = slot * POSITION_STRIDE;
      const target = slot * SCREEN_STRIDE;

      screen[target] = radarX(overview, sampleAt(positions, offset)) * scale;
      screen[target + 1] = radarY(overview, sampleAt(positions, offset + 1)) * scale;
      screen[target + 2] =
        levelIndexAt(overview, sampleAt(positions, offset + 2)) === levelIndex
          ? 1
          : OTHER_LEVEL_ALPHA;
    }
  }

  const screenX = (slot: number) => sampleAt(screen, slot * SCREEN_STRIDE);
  const screenY = (slot: number) => sampleAt(screen, slot * SCREEN_STRIDE + 1);
  const levelAlpha = (slot: number) => sampleAt(screen, slot * SCREEN_STRIDE + 2);

  /**
   * The cone the selected player can see, drawn before every token so it tints the plate rather
   * than the players standing in it. One cone at a time is information; ten is a fog, which is what
   * the needles are for — DESIGN.md §6.1.
   */
  function drawVision(context: CanvasRenderingContext2D): void {
    if (selectedSlot === null) return;

    const team = teamBySlot[selectedSlot];
    if (team === undefined) return;
    if ((sampleAt(track.flags, base + selectedSlot) & FLAG_ALIVE) === 0) return;
    if (levelAlpha(selectedSlot) !== 1) return;

    const radius = (VISION_FADE_UNITS / overview.scale) * scale;
    if (radius <= 0) return;

    const angle = screenAngle(track, base + selectedSlot);

    context.save();
    context.translate(screenX(selectedSlot), screenY(selectedSlot));
    context.globalAlpha = VISION_ALPHA;
    context.fillStyle = visionFill(context, radius, colors.team[team]);

    context.beginPath();
    context.moveTo(0, 0);
    context.arc(0, 0, radius, angle - VISION_HALF_ANGLE, angle + VISION_HALF_ANGLE);
    context.closePath();
    context.fill();

    context.restore();
  }

  /** What sits under a living player's token: how far they can be heard, and where they look. */
  function drawUnderToken(context: CanvasRenderingContext2D, slot: number, team: Team): void {
    const sample = base + slot;
    const audible = isAudibilityShown
      ? (audibleRadiusAt(track, sample) / overview.scale) * scale
      : 0;

    if (audible > 0) {
      drawAudibleRing(
        context,
        screenX(slot),
        screenY(slot),
        audible,
        colors.dead,
        levelAlpha(slot),
      );
    }

    // A flashed player is not looking anywhere, and the plate does not claim otherwise.
    if (sampleAt(blindRemaining, slot) > 0) return;

    drawNeedle(
      context,
      screenX(slot),
      screenY(slot),
      screenAngle(track, sample),
      (sampleAt(track.flags, sample) & FLAG_SCOPED) !== 0,
      colors.team[team],
    );
  }

  /** What sits over it: the hit it just took, the flash it is under, and the objective it works on. */
  function drawOverToken(context: CanvasRenderingContext2D, slot: number): void {
    const flash = sampleAt(damageFlashes, slot);

    if (flash > 0) {
      context.globalAlpha = levelAlpha(slot) * flash;
      drawDamageFlash(context, screenX(slot), screenY(slot), colors.damage);
      context.globalAlpha = levelAlpha(slot);
    }

    const remaining = sampleAt(blindRemaining, slot);
    if (remaining > 0) {
      drawBlindDisc(
        context,
        screenX(slot),
        screenY(slot),
        remaining,
        colors.blind,
        levelAlpha(slot),
      );
    }

    if (slot === selectedSlot) {
      drawSelectionRing(
        context,
        screenX(slot),
        screenY(slot),
        colors.selectionRing,
        colors.selectionEdge,
      );
    }

    const progress = bombProgressAt(demo, clock.frame, asPlayerSlot(slot));
    if (progress === null) return;

    drawProgressArc(context, screenX(slot), screenY(slot), progress, colors.objective);
  }

  function drawTokens(context: CanvasRenderingContext2D): void {
    for (let slot = 0; slot < track.slotCount; slot++) {
      const team = teamBySlot[slot];
      if (team === undefined) continue;

      const isAlive = (sampleAt(track.flags, base + slot) & FLAG_ALIVE) !== 0;
      context.globalAlpha = levelAlpha(slot);

      if (isAlive) {
        drawUnderToken(context, slot, team);
        drawToken(context, screenX(slot), screenY(slot), TOKEN_RADIUS_PX, colors.team[team]);
        drawOverToken(context, slot);
        continue;
      }

      // A body settles rather than disappearing: the information a vanished token takes with it is
      // *where* it happened — DESIGN.md §6.1. Both the size and the fade are functions of match
      // time, so scrubbing back through the kill plays the settle again.
      const settled = sampleAt(deathProgress, slot);

      context.globalAlpha = levelAlpha(slot) * (1 - (1 - DEAD_ALPHA) * settled);
      drawToken(
        context,
        screenX(slot),
        screenY(slot),
        TOKEN_RADIUS_PX - (TOKEN_RADIUS_PX - TOKEN_DEAD_RADIUS_PX) * settled,
        colors.dead,
      );
    }
  }

  function drawLabels(context: CanvasRenderingContext2D, size: CanvasSize): void {
    context.font = labelStyle.font;
    context.textAlign = 'left';
    context.textBaseline = 'middle';
    // The halo is a stroke under the glyphs rather than a box behind them: a background per label
    // is ten more rectangles on a plate that now carries ten larger tokens — DESIGN.md §6.1.
    context.lineWidth = 2 * LABEL_HALO_PX;
    context.lineJoin = 'round';
    context.strokeStyle = colors.labelHalo;
    placer.reset();

    for (let slot = 0; slot < track.slotCount; slot++) {
      if (teamBySlot[slot] === undefined) continue;
      if ((sampleAt(track.flags, base + slot) & FLAG_ALIVE) === 0) continue;

      const label = labelBySlot[slot];
      const width = sampleAt(labelWidths, slot);
      if (label === undefined || width === 0) continue;

      placer.place(screenX(slot), screenY(slot), TOKEN_RADIUS_PX, width, size);

      const x = placer.x + LABEL_HALO_PX;
      const y = placer.y + LABEL_HEIGHT_PX / 2;

      context.globalAlpha = levelAlpha(slot);
      context.strokeText(label, x, y);

      context.fillStyle = colors.labelInk;
      context.fillText(label, x, y);
    }
  }

  return (context, size) => {
    if (track.frameCount === 0) return;

    base = readPositions(track, clock.frame, positions) * track.slotCount;
    scale = size.width / RADAR_IMAGE_SIZE;

    if (!areLabelsMeasured) measureLabels(context);

    // These read the fractional clock rather than the sample under it, so a hit decays smoothly
    // between samples and does so in match time — DESIGN.md §8's test for what is a draw.
    damageFlashBySlot(demo, clock.frame, damageFlashes);
    blindRemainingBySlot(demo, clock.frame, blindRemaining);
    deathProgressBySlot(demo, clock.frame, deathProgress);
    readScreen();

    drawVision(context);
    drawTokens(context);
    drawLabels(context, size);
  };
}
