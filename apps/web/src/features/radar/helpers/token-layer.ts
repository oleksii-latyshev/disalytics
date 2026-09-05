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
  FLAG_WALKING,
  type ParsedDemo,
  type PlayerSlot,
  sampleAt,
  type Team,
  visibleShots,
  weaponClasses,
  weaponIcons,
} from '@disa/demo-core';
import { type MapOverview, RADAR_IMAGE_SIZE } from '@disa/map-data';
import { positionScratch, readPositions } from '@/core/playback';
import type { Layer } from '@/core/renderer';
import type { RadarColors } from './colors';
import { type LabelStyle, type LabelSubject, labelPass } from './labels';
import { plateProjection } from './projection';
import {
  DEAD_ALPHA,
  DEAD_RADIUS_FRACTION,
  drawAudibleRing,
  drawBlindDisc,
  drawDamageFlash,
  drawNeedle,
  drawProgressArc,
  drawSelectionRing,
  drawToken,
  drawWalkHollow,
  needleReach,
  screenAngle,
  screenAngleOf,
} from './tokens';
import { tracerLength, tracerStroke } from './tracer';
import {
  type PlateBounds,
  type PlateGeometry,
  type PlateView,
  plateBounds,
  plateGeometry,
  readPlateBounds,
  readPlateGeometry,
} from './view';
import { visionRadius, visionWedge } from './vision';

export interface PlayerTokensOptions {
  readonly demo: ParsedDemo;
  readonly clock: Clock;
  readonly overview: MapOverview;
  readonly levelIndex: number;
  readonly teamBySlot: readonly (Team | undefined)[];
  readonly labelBySlot: readonly string[];
  readonly selectedSlot: PlayerSlot | null;
  /**
   * The selected player's round, formatted and translated by the caller, or `null` where nobody is
   * selected. A canvas cannot reach the message catalogue, and a draw may not build a string.
   */
  readonly detail: string | null;
  readonly isAudibilityShown: boolean;
  readonly colors: RadarColors;
  readonly labelStyle: LabelStyle;
  /** Read at draw time, not captured: a pan repaints these layers rather than rebuilding them. */
  readonly view: { readonly current: PlateView };
}

/**
 * How many shots the plate will draw at once. `docs/PARSER.md` §22 counted a whole match's worst
 * frame at 8 over the same window, so this is that with room rather than a guess — and it is a
 * ceiling rather than a budget: the buffers behind it are fixed for the life of the layer.
 */
const MAX_TRACERS = 16;

/**
 * The clock is read at draw time rather than captured as a frame, which is what lets the rAF loop
 * repaint without rebuilding the layer — and so without allocating — every animation frame.
 */
export function playerTokens(options: PlayerTokensOptions): Layer {
  const { demo, clock, overview, levelIndex, teamBySlot, colors, view } = options;
  const { labelBySlot, selectedSlot, detail, isAudibilityShown, labelStyle } = options;
  const { track } = demo;

  const positions = positionScratch(track);
  const labels = labelPass(labelBySlot, track.slotCount, labelStyle, colors.label);
  let areLabelsMeasured = false;

  const plate = plateProjection(overview, levelIndex, track.slotCount);

  // Everything else a frame derives before it draws, owned by the layer for the same reason
  // `positionScratch` is: nothing on the way to the canvas allocates.
  const damageFlashes = new Float32Array(track.slotCount);
  const blindRemaining = new Float32Array(track.slotCount);
  const deathProgress = new Float32Array(track.slotCount);

  // A shot is drawn per trigger pull rather than per player, so these are sized by how many can be
  // in the window at once rather than by the roster. `docs/PARSER.md` §22 measured a match's worst
  // frame at 8 with the same window; the ceiling is what keeps the buffers fixed, and a burst past
  // it loses its oldest ray rather than growing an array inside a draw.
  const shotIndices = new Int32Array(MAX_TRACERS);
  const shotLife = new Float32Array(MAX_TRACERS);
  let shotCount = 0;

  // The per-match weapon table resolved once, so a token reads what it is holding by index rather
  // than by name — `MatchHeader.weapons` is a different lookup for every demo, and a string lookup
  // per player per animation frame is the walk that does not belong in a draw. Two tables because
  // the label draws the model where there is one and falls back to the class where there is not.
  const classByWeapon = weaponClasses(demo.header.weapons);
  const iconByWeapon = weaponIcons(demo.header.weapons);

  // The frame's own scalars, set once per draw and read by every pass below.
  let base = 0;
  let scale = 0;
  let tokenRadius = 0;

  // The reader's zoom and pan, resolved once per draw into the caller's own objects.
  const geometry: PlateGeometry = plateGeometry();
  const bounds: PlateBounds = plateBounds();

  // Built once, outside the draw, so their gradients are cached across frames rather than per frame.
  const wedge = visionWedge();
  const tracer = tracerStroke();

  const isAlive = (slot: number) => (sampleAt(track.flags, base + slot) & FLAG_ALIVE) !== 0;

  // Built once rather than per frame: the label pass reads this frame's values through it, and a
  // fresh object every draw is exactly the allocation the whole layer is written to avoid. A dead
  // player loses its name along with its needle and its ring — DESIGN.md §6.1.
  const named: LabelSubject = {
    isNamed: (slot) => teamBySlot[slot] !== undefined && isAlive(slot),
    x: plate.x,
    y: plate.y,
    alpha: plate.alpha,
    // `WEAPON_NONE` falls off the end of the table, which is the answer for a slot no sample ever
    // saw holding anything — a different thing from `unknown`, and drawn as nothing at all.
    weapon: (slot) => classByWeapon[sampleAt(track.weapon, base + slot)] ?? null,
    icon: (slot) => iconByWeapon[sampleAt(track.weapon, base + slot)],
    // The round goes under one name and only one: the reader asked about this player by selecting
    // them, and ten labels each carrying four numbers is a plate nobody can read.
    detail: (slot) => (slot === selectedSlot ? detail : null),
  };

  /** Whether the selected player is on the plate to be given one, and where their cone points. */
  function drawVision(context: CanvasRenderingContext2D): void {
    if (selectedSlot === null) return;

    const team = teamBySlot[selectedSlot];
    if (team === undefined) return;
    if (!isAlive(selectedSlot)) return;
    if (plate.alpha(selectedSlot) !== 1) return;

    wedge(
      context,
      plate.x(selectedSlot),
      plate.y(selectedSlot),
      screenAngle(track, base + selectedSlot),
      visionRadius(overview, scale),
      colors.team[team],
    );
  }

  /**
   * Every shot still on the plate, drawn before any token so a ray crossing the map never covers a
   * player standing in it.
   *
   * The angle is the shot's own rather than the sample beside it — that is what `SCHEMA_VERSION` 8
   * bought — so a burst whose aim walked fans out instead of collapsing onto the last direction.
   *
   * A pass of its own rather than a step inside the token loop, and that is what keeps two rules
   * from the spur it replaces: a blinded player still draws one, because they still pulled the
   * trigger even where the needle no longer claims a direction, and so does a player who has since
   * died, because the bullet had already left when they fell.
   */
  function drawTracers(context: CanvasRenderingContext2D): void {
    if (shotCount === 0) return;

    const length = tracerLength(overview, scale);

    for (let index = 0; index < shotCount; index++) {
      const shot = demo.events.shots[sampleAt(shotIndices, index)];
      if (shot === undefined) continue;

      const slot = shot.shooter;
      if (teamBySlot[slot] === undefined) continue;

      const isScoped = (sampleAt(track.flags, base + slot) & FLAG_SCOPED) !== 0;

      tracer(
        context,
        plate.x(slot),
        plate.y(slot),
        screenAngleOf(shot.yaw),
        needleReach(tokenRadius, isScoped),
        length,
        colors.gunfire,
        plate.alpha(slot) * sampleAt(shotLife, index),
      );
    }
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
        plate.x(slot),
        plate.y(slot),
        audible,
        colors.dead,
        plate.alpha(slot),
      );
    }

    const angle = screenAngle(track, sample);
    const isScoped = (sampleAt(track.flags, sample) & FLAG_SCOPED) !== 0;

    // A flashed player is not looking anywhere, and the plate does not claim otherwise.
    if (sampleAt(blindRemaining, slot) > 0) return;

    drawNeedle(
      context,
      plate.x(slot),
      plate.y(slot),
      tokenRadius,
      angle,
      isScoped,
      colors.team[team],
    );
  }

  /** What sits over it: the hit it just took, the flash it is under, and the objective it works on. */
  function drawOverToken(context: CanvasRenderingContext2D, slot: number): void {
    const flash = sampleAt(damageFlashes, slot);

    if (flash > 0) {
      context.globalAlpha = plate.alpha(slot) * flash;
      drawDamageFlash(context, plate.x(slot), plate.y(slot), tokenRadius, colors.damage);
      context.globalAlpha = plate.alpha(slot);
    }

    // After the hit rather than under it: a flash repaints the whole token, and a player being shot
    // at is still walking. DESIGN.md §6.1 puts the mark inside the token because every radius
    // outside it already means something else.
    if ((sampleAt(track.flags, base + slot) & FLAG_WALKING) !== 0) {
      drawWalkHollow(context, plate.x(slot), plate.y(slot), tokenRadius, colors.hollow);
    }

    const remaining = sampleAt(blindRemaining, slot);
    if (remaining > 0) {
      drawBlindDisc(
        context,
        plate.x(slot),
        plate.y(slot),
        tokenRadius,
        remaining,
        colors.blind,
        plate.alpha(slot),
      );
    }

    if (slot === selectedSlot) {
      drawSelectionRing(
        context,
        plate.x(slot),
        plate.y(slot),
        tokenRadius,
        colors.selectionRing,
        colors.selectionEdge,
      );
    }

    const progress = bombProgressAt(demo, clock.frame, asPlayerSlot(slot));
    if (progress === null) return;

    drawProgressArc(context, plate.x(slot), plate.y(slot), tokenRadius, progress, colors.objective);
  }

  function drawTokens(context: CanvasRenderingContext2D): void {
    for (let slot = 0; slot < track.slotCount; slot++) {
      const team = teamBySlot[slot];
      if (team === undefined) continue;

      context.globalAlpha = plate.alpha(slot);

      if (isAlive(slot)) {
        drawUnderToken(context, slot, team);
        drawToken(context, plate.x(slot), plate.y(slot), tokenRadius, colors.team[team]);
        drawOverToken(context, slot);
        continue;
      }

      // A body settles rather than disappearing: the information a vanished token takes with it is
      // *where* it happened — DESIGN.md §6.1. Both the size and the fade are functions of match
      // time, so scrubbing back through the kill plays the settle again.
      const settled = sampleAt(deathProgress, slot);

      context.globalAlpha = plate.alpha(slot) * (1 - (1 - DEAD_ALPHA) * settled);
      drawToken(
        context,
        plate.x(slot),
        plate.y(slot),
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
    shotCount = visibleShots(demo, clock.frame, shotIndices, shotLife);
    plate.read(positions, scale);

    drawVision(context);
    drawTracers(context);
    drawTokens(context);
    labels.draw(context, bounds, named, tokenRadius);
  };
}
