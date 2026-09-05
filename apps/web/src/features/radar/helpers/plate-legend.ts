import { FIRE_AREA_ALPHA, SMOKE_AREA_ALPHA, UTILITY_NAMES } from '@disa/demo-core';
import type { RadarColors } from './colors';
import { damageFigure, drawDamageFigure } from './damage-figure';
import { drawGrenadeMark, drawWeaponMark } from './equipment-marks';
import { drawDecoyPulse, drawFlashMark, drawHeRing, trajectoryStroke } from './grenades';
import { drawKillFall, drawKillOrigin, drawKillPath } from './kill-line';
import { haloStroke, type LabelStyle } from './labels';
import {
  DEAD_ALPHA,
  DEAD_RADIUS_FRACTION,
  drawAudibleRing,
  drawBlindDisc,
  drawNeedle,
  drawProgressArc,
  drawSelectionRing,
  drawToken,
  drawWalkHollow,
  needleReach,
  TOKEN_RADIUS_PX,
} from './tokens';
import { tracerStart, tracerStroke } from './tracer';
import { bodyParts, drawFireBody, drawSmokeBody } from './utility-body';

/**
 * The two bodies the legend draws, laid out by the plate's own function so a swatch cannot show a
 * shape the map never draws. Index 0 is the smoke and index 1 the fire — the order is the argument.
 */
const LEGEND_BODIES = bodyParts([{ type: 'smokegrenade' }, { type: 'molotov' }]);

/** One instance for the sheet, for the reason the layer holds one: the gradient is cached in it. */
const tracer = tracerStroke();

/**
 * The swatch every mark is drawn in, in CSS pixels. Wide enough for two tokens with their needles
 * and tall enough for the largest ring a token carries, which is what fixes the number: the marks
 * are drawn at the size the plate draws them, not at a size chosen to fill the box.
 */
export const MARK_WIDTH_PX = 56;
export const MARK_HEIGHT_PX = 28;

const CENTRE_X = MARK_WIDTH_PX / 2;
const CENTRE_Y = MARK_HEIGHT_PX / 2;

/** The pair the `player` mark draws, far enough apart that neither needle reaches the other. */
const LEFT_X = 14;
const RIGHT_X = 42;

/** Up and to the right, so a needle fits the swatch's height as well as its width. */
const NEEDLE_ANGLE = -Math.PI / 4;

/**
 * The weapon swatch draws its token further left than the pair above it does, because the mark's box
 * is 31px wide and the swatch is 56: at `LEFT_X` the box would run 3px past the right edge and the
 * legend would be showing a clipped outline of a weapon. `WEAPON_STRIP_X` is the box's left edge,
 * which is where the plate reserves it beside a token.
 */
const WEAPON_TOKEN_X = 10;
const WEAPON_STRIP_X = WEAPON_TOKEN_X + TOKEN_RADIUS_PX + 6;

/**
 * The tracer's swatch, which draws its token further left than the pair above for the same reason
 * the weapon's does: on the plate the ray is 512 world units, which is wider than this whole box,
 * so the swatch chooses the reach the way it chooses a radius below — the drawing is the plate's,
 * the room is the box's. The length is derived rather than typed, or the mark runs off the edge.
 */
const TRACER_TOKEN_X = 8;
const TRACER_LENGTH_PX =
  MARK_WIDTH_PX - TRACER_TOKEN_X - tracerStart(needleReach(TOKEN_RADIUS_PX, false)) - 2;

/** Radii the swatch chooses, where on the plate the map's own scale does — everything else is the renderer's. */
const AUDIBLE_RADIUS_PX = 12;
const AREA_RADIUS_PX = 11;

/** Part-way through, so a mark that counts something down is shown counting rather than full. */
const PART_WAY = 0.6;

/**
 * The hit's swatch: a token left of centre with its figure where the plate would place one, and a
 * specimen big enough to read as an exchange rather than as a graze. It is a numeral rather than a
 * message — the digits are the same reading in both locales — the way `PART_WAY` above is a phase
 * rather than a duration.
 */
const HIT_TOKEN_X = 18;
const HIT_FIGURE_X = HIT_TOKEN_X + TOKEN_RADIUS_PX + 6;
const HIT_FIGURE = damageFigure(89) ?? '';

export type PlateMarkId =
  | 'player'
  | 'weapon'
  | 'walking'
  | 'firing'
  | 'selected'
  | 'hit'
  | 'blinded'
  | 'objective'
  | 'dead'
  | 'audible'
  | 'trajectory'
  | 'he'
  | 'flash'
  | 'smoke'
  | 'fire'
  | 'decoy'
  | 'kill';

export interface PlateMark {
  readonly id: PlateMarkId;
  /**
   * What the mark is called where it has a name of its own. Game vocabulary, so it arrives from
   * `demo-core` untranslated — `AGENTS.md` §11.
   */
  readonly vocabulary?: string;
  /**
   * The style arrives with the colours rather than being read here, for the reason the colours do:
   * the caller resolves the document once, outside the paint, and a mark that draws no text ignores
   * it.
   */
  readonly draw: (
    context: CanvasRenderingContext2D,
    colors: RadarColors,
    style: LabelStyle,
  ) => void;
}

/**
 * Every mark the plate draws, drawn by the plate's own functions — `docs/DESIGN.md` §10.6. A legend
 * written by hand drifts from the renderer within two issues, so nothing here decides what a mark
 * looks like: the colour comes off `RadarColors`, the geometry and the opacity out of the same
 * `tokens`, `grenades` and `kill-line` helpers the layers call, and the only things this file
 * chooses are where in the swatch a mark sits and how far through its own life it is caught.
 *
 * The vision wedge is the one mark of §6.1 that is missing. Its geometry lives inside the token
 * layer, around a gradient the layer caches across frames, and lifting it out for a swatch would
 * move a frame path for a picture — so the entry for a selected player names the cone instead.
 */
export const PLATE_MARKS: readonly PlateMark[] = [
  {
    id: 'player',
    draw: (context, colors) => {
      drawToken(context, LEFT_X, CENTRE_Y, TOKEN_RADIUS_PX, colors.team.CT);
      drawNeedle(context, LEFT_X, CENTRE_Y, TOKEN_RADIUS_PX, NEEDLE_ANGLE, false, colors.team.CT);

      drawToken(context, RIGHT_X, CENTRE_Y, TOKEN_RADIUS_PX, colors.team.T);
      drawNeedle(context, RIGHT_X, CENTRE_Y, TOKEN_RADIUS_PX, NEEDLE_ANGLE, false, colors.team.T);
    },
  },
  {
    id: 'weapon',
    draw: (context, colors) => {
      drawToken(context, WEAPON_TOKEN_X, CENTRE_Y, TOKEN_RADIUS_PX, colors.team.CT);

      // One mark, where the name would start — the arrangement the plate actually draws. Which
      // weapon it is, is the sentence's job: three outlines in a 56px swatch is a row of shapes
      // with no token beside them, which is not what a reader sees.
      haloStroke(context, colors.label.halo);
      drawWeaponMark(context, WEAPON_STRIP_X, CENTRE_Y, 'rifle', 'ak47', colors.label.ink);
    },
  },
  {
    id: 'walking',
    draw: (context, colors) => {
      drawToken(context, LEFT_X, CENTRE_Y, TOKEN_RADIUS_PX, colors.team.CT);

      drawToken(context, RIGHT_X, CENTRE_Y, TOKEN_RADIUS_PX, colors.team.CT);
      drawWalkHollow(context, RIGHT_X, CENTRE_Y, TOKEN_RADIUS_PX, colors.hollow);
    },
  },
  {
    id: 'firing',
    draw: (context, colors) => {
      drawToken(context, TRACER_TOKEN_X, CENTRE_Y, TOKEN_RADIUS_PX, colors.team.CT);
      drawNeedle(context, TRACER_TOKEN_X, CENTRE_Y, TOKEN_RADIUS_PX, 0, false, colors.team.CT);
      tracer(
        context,
        TRACER_TOKEN_X,
        CENTRE_Y,
        0,
        needleReach(TOKEN_RADIUS_PX, false),
        TRACER_LENGTH_PX,
        colors.gunfire,
        1,
      );
    },
  },
  {
    id: 'selected',
    draw: (context, colors) => {
      drawToken(context, CENTRE_X, CENTRE_Y, TOKEN_RADIUS_PX, colors.team.CT);
      drawSelectionRing(
        context,
        CENTRE_X,
        CENTRE_Y,
        TOKEN_RADIUS_PX,
        colors.selectionRing,
        colors.selectionEdge,
      );
    },
  },
  {
    id: 'hit',
    draw: (context, colors, style) => {
      drawToken(context, HIT_TOKEN_X, CENTRE_Y, TOKEN_RADIUS_PX, colors.team.CT);
      drawToken(context, HIT_TOKEN_X, CENTRE_Y, TOKEN_RADIUS_PX, colors.damage);

      haloStroke(context, colors.label.halo);
      context.textAlign = 'left';
      context.textBaseline = 'middle';
      drawDamageFigure(
        context,
        HIT_FIGURE_X,
        CENTRE_Y,
        HIT_FIGURE,
        style.damageFont,
        colors.label.damage,
      );
    },
  },
  {
    id: 'blinded',
    draw: (context, colors) => {
      drawToken(context, CENTRE_X, CENTRE_Y, TOKEN_RADIUS_PX, colors.team.CT);
      drawBlindDisc(context, CENTRE_X, CENTRE_Y, TOKEN_RADIUS_PX, PART_WAY, colors.blind, 1);
    },
  },
  {
    id: 'objective',
    draw: (context, colors) => {
      drawToken(context, CENTRE_X, CENTRE_Y, TOKEN_RADIUS_PX, colors.team.CT);
      drawProgressArc(context, CENTRE_X, CENTRE_Y, TOKEN_RADIUS_PX, PART_WAY, colors.objective);
    },
  },
  {
    id: 'dead',
    draw: (context, colors) => {
      context.globalAlpha = DEAD_ALPHA;
      drawToken(context, CENTRE_X, CENTRE_Y, TOKEN_RADIUS_PX * DEAD_RADIUS_FRACTION, colors.dead);
    },
  },
  {
    id: 'audible',
    draw: (context, colors) => {
      drawToken(context, CENTRE_X, CENTRE_Y, TOKEN_RADIUS_PX, colors.team.CT);
      drawAudibleRing(context, CENTRE_X, CENTRE_Y, AUDIBLE_RADIUS_PX, colors.dead, 1);
    },
  },
  {
    id: 'trajectory',
    draw: (context, colors) => {
      trajectoryStroke(context, colors.trajectory);

      context.beginPath();
      context.moveTo(8, MARK_HEIGHT_PX - 6);
      context.quadraticCurveTo(CENTRE_X, -6, MARK_WIDTH_PX - 8, CENTRE_Y - 2);
      context.stroke();

      // The grenade at the head of it, which is the other half of the mark: a smoke on its way is
      // legible as a smoke before it lands.
      drawGrenadeMark(context, MARK_WIDTH_PX - 8, CENTRE_Y - 2, 'smoke', colors.nadeSmoke);
    },
  },
  {
    id: 'he',
    vocabulary: UTILITY_NAMES.he,
    draw: (context, colors) => {
      drawHeRing(context, CENTRE_X, CENTRE_Y, 1, AREA_RADIUS_PX, false, colors.nadeHe);
    },
  },
  {
    id: 'flash',
    vocabulary: UTILITY_NAMES.flash,
    draw: (context, colors) => {
      // Its brightest moment is its earliest, and the mark is faint here for the reason it is faint
      // on the plate: what a flashbang leaves behind is on the players, not on the ground (§6.2).
      drawFlashMark(context, CENTRE_X, CENTRE_Y, 0.5, AREA_RADIUS_PX * 2, colors.blind);
    },
  },
  {
    id: 'smoke',
    vocabulary: UTILITY_NAMES.smoke,
    draw: (context, colors) => {
      drawSmokeBody(
        context,
        CENTRE_X,
        CENTRE_Y,
        AREA_RADIUS_PX,
        SMOKE_AREA_ALPHA,
        colors.nadeSmoke,
        LEGEND_BODIES,
        0,
      );
    },
  },
  {
    id: 'fire',
    vocabulary: UTILITY_NAMES.fire,
    draw: (context, colors) => {
      drawFireBody(
        context,
        CENTRE_X,
        CENTRE_Y,
        AREA_RADIUS_PX,
        FIRE_AREA_ALPHA,
        colors.nadeMolotov,
        LEGEND_BODIES,
        1,
      );
    },
  },
  {
    id: 'decoy',
    vocabulary: UTILITY_NAMES.decoy,
    draw: (context, colors) => {
      // A quarter through the pulse is its widest — the phase feeds a sine curve.
      drawDecoyPulse(context, CENTRE_X, CENTRE_Y, 0.25, colors.nadeDecoy);
    },
  },
  {
    id: 'kill',
    draw: (context, colors) => {
      drawKillPath(context, LEFT_X, CENTRE_Y, RIGHT_X, CENTRE_Y, 1, colors.killLine);
      drawKillOrigin(context, LEFT_X, CENTRE_Y, 1, colors.team.CT);
      drawKillFall(context, RIGHT_X, CENTRE_Y, 1, colors.team.T);
    },
  },
];
