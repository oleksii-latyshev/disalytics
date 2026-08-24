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
import type { Layer } from '@/core/renderer';
import type { RadarColors } from './colors';
import { type LabelStyle, type LabelSubject, labelPass } from './labels';
import { levelIndexAt, OTHER_LEVEL_ALPHA } from './levels';
import {
  DEAD_RADIUS_FRACTION,
  drawAudibleRing,
  drawBlindDisc,
  drawDamageFlash,
  drawNeedle,
  drawProgressArc,
  drawSelectionRing,
  drawToken,
  screenAngle,
} from './tokens';
import {
  type PlateBounds,
  type PlateGeometry,
  type PlateView,
  plateBounds,
  plateGeometry,
  readPlateBounds,
  readPlateGeometry,
} from './view';

const VISION_ALPHA = 0.15;
const VISION_FADE_UNITS = 1000;
/** The game's default field of view, so the wedge stands for what the player can actually see. */
const VISION_HALF_ANGLE = Math.PI / 4;

/** What a token has faded to once its player is a body — DESIGN.md §6.1. */
export const DEAD_ALPHA = 0.5;

/** Screen `x`, screen `y` and the level's opacity, per slot. */
const SCREEN_STRIDE = 3;

/**
 * The map itself, under everything. It is drawn at the reader's zoom rather than scaled by CSS, so
 * every mark above it stays on a device pixel — DESIGN.md §6.3. The image is 1024px square, so past
 * about 1.4× the plate is enlarging it rather than resolving more of it; that is the asset's
 * ceiling and not the renderer's.
 */
export function radarBackdrop(
  image: HTMLImageElement,
  view: { readonly current: PlateView },
): Layer {
  return (context, size) => {
    const { zoom, panX, panY } = view.current;

    context.drawImage(image, panX, panY, size.width * zoom, size.height * zoom);
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
  /** Read at draw time, not captured: a pan repaints these layers rather than rebuilding them. */
  readonly view: { readonly current: PlateView };
}

/**
 * The clock is read at draw time rather than captured as a frame, which is what lets the rAF loop
 * repaint without rebuilding the layer — and so without allocating — every animation frame.
 */
export function playerTokens(options: PlayerTokensOptions): Layer {
  const { demo, clock, overview, levelIndex, teamBySlot, colors, view } = options;
  const { labelBySlot, selectedSlot, isAudibilityShown, labelStyle } = options;
  const { track } = demo;

  const positions = positionScratch(track);
  const labels = labelPass(labelBySlot, track.slotCount, labelStyle, colors.label);
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
  let tokenRadius = 0;

  // The reader's zoom and pan, resolved once per draw into the caller's own objects.
  const geometry: PlateGeometry = plateGeometry();
  const bounds: PlateBounds = plateBounds();

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
  const isAlive = (slot: number) => (sampleAt(track.flags, base + slot) & FLAG_ALIVE) !== 0;

  // Built once rather than per frame: the label pass reads this frame's values through it, and a
  // fresh object every draw is exactly the allocation the whole layer is written to avoid. A dead
  // player loses its name along with its needle and its ring — DESIGN.md §6.1.
  const named: LabelSubject = {
    isNamed: (slot) => teamBySlot[slot] !== undefined && isAlive(slot),
    x: screenX,
    y: screenY,
    alpha: levelAlpha,
  };

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
      tokenRadius,
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
      drawDamageFlash(context, screenX(slot), screenY(slot), tokenRadius, colors.damage);
      context.globalAlpha = levelAlpha(slot);
    }

    const remaining = sampleAt(blindRemaining, slot);
    if (remaining > 0) {
      drawBlindDisc(
        context,
        screenX(slot),
        screenY(slot),
        tokenRadius,
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
        tokenRadius,
        colors.selectionRing,
        colors.selectionEdge,
      );
    }

    const progress = bombProgressAt(demo, clock.frame, asPlayerSlot(slot));
    if (progress === null) return;

    drawProgressArc(context, screenX(slot), screenY(slot), tokenRadius, progress, colors.objective);
  }

  function drawTokens(context: CanvasRenderingContext2D): void {
    for (let slot = 0; slot < track.slotCount; slot++) {
      const team = teamBySlot[slot];
      if (team === undefined) continue;

      const isAlive = (sampleAt(track.flags, base + slot) & FLAG_ALIVE) !== 0;
      context.globalAlpha = levelAlpha(slot);

      if (isAlive) {
        drawUnderToken(context, slot, team);
        drawToken(context, screenX(slot), screenY(slot), tokenRadius, colors.team[team]);
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
        tokenRadius * (1 - (1 - DEAD_RADIUS_FRACTION) * settled),
        colors.dead,
      );
    }
  }

  return (context, size) => {
    if (track.frameCount === 0) return;

    base = readPositions(track, clock.frame, positions) * track.slotCount;

    readPlateGeometry(view.current, size, RADAR_IMAGE_SIZE, geometry);
    readPlateBounds(geometry, size, bounds);
    scale = geometry.scale;
    tokenRadius = geometry.tokenRadius;

    // The pan is a translation, so it moves the world without touching the size of anything drawn
    // in device pixels — a needle, a halo and a hairline are the same width at every zoom.
    context.translate(geometry.offsetX, geometry.offsetY);

    if (!areLabelsMeasured) {
      labels.measure(context);
      areLabelsMeasured = true;
    }

    // These read the fractional clock rather than the sample under it, so a hit decays smoothly
    // between samples and does so in match time — DESIGN.md §8's test for what is a draw.
    damageFlashBySlot(demo, clock.frame, damageFlashes);
    blindRemainingBySlot(demo, clock.frame, blindRemaining);
    deathProgressBySlot(demo, clock.frame, deathProgress);
    readScreen();

    drawVision(context);
    drawTokens(context);
    labels.draw(context, bounds, named, tokenRadius);
  };
}
