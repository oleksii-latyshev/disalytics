import { FIRE_AREA_ALPHA, SMOKE_AREA_ALPHA, UTILITY_NAMES } from '@disa/demo-core';
import type { RadarColors } from './colors';
import {
  drawDecoyPulse,
  drawFlashMark,
  drawHeRing,
  drawMolotovArea,
  drawSmokeCloud,
  trajectoryStroke,
} from './grenades';
import { drawKillFall, drawKillOrigin, drawKillPath } from './kill-line';
import { haloStroke } from './labels';
import {
  DEAD_ALPHA,
  DEAD_RADIUS_FRACTION,
  drawAudibleRing,
  drawBlindDisc,
  drawGunfireSpur,
  drawNeedle,
  drawProgressArc,
  drawSelectionRing,
  drawToken,
  drawWalkHollow,
  TOKEN_RADIUS_PX,
} from './tokens';
import { drawWeaponMark, WEAPON_MARK_PX } from './weapon-marks';

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

/** Where the name would begin, which is where the weapon mark sits on the plate. */
const WEAPON_STRIP_X = TOKEN_RADIUS_PX + 6 + WEAPON_MARK_PX / 2;

/** Radii the swatch chooses, where on the plate the map's own scale does — everything else is the renderer's. */
const AUDIBLE_RADIUS_PX = 12;
const AREA_RADIUS_PX = 11;

/** Part-way through, so a mark that counts something down is shown counting rather than full. */
const PART_WAY = 0.6;

/** The one seed the molotov's jittered edge is drawn with here; on the plate it is the grenade's. */
const MOLOTOV_SEED = 3;

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
  readonly draw: (context: CanvasRenderingContext2D, colors: RadarColors) => void;
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
      drawToken(context, LEFT_X, CENTRE_Y, TOKEN_RADIUS_PX, colors.team.CT);

      // One mark, where the name would start — the arrangement the plate actually draws. Which
      // class it is, is the sentence's job: three silhouettes in a 56px swatch is a row of shapes
      // with no token beside them, which is not what a reader sees.
      haloStroke(context, colors.label.halo);
      drawWeaponMark(context, LEFT_X + WEAPON_STRIP_X, CENTRE_Y, 'rifle', colors.label.ink);
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
      drawToken(context, LEFT_X, CENTRE_Y, TOKEN_RADIUS_PX, colors.team.CT);
      drawNeedle(context, LEFT_X, CENTRE_Y, TOKEN_RADIUS_PX, 0, false, colors.team.CT);
      drawGunfireSpur(context, LEFT_X, CENTRE_Y, TOKEN_RADIUS_PX, 0, false, colors.gunfire, 1);
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
    draw: (context, colors) => {
      drawToken(context, CENTRE_X, CENTRE_Y, TOKEN_RADIUS_PX, colors.team.CT);
      drawToken(context, CENTRE_X, CENTRE_Y, TOKEN_RADIUS_PX, colors.damage);
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
      drawFlashMark(context, CENTRE_X, CENTRE_Y, 0.5, colors.blind);
    },
  },
  {
    id: 'smoke',
    vocabulary: UTILITY_NAMES.smoke,
    draw: (context, colors) => {
      drawSmokeCloud(
        context,
        CENTRE_X,
        CENTRE_Y,
        AREA_RADIUS_PX,
        SMOKE_AREA_ALPHA,
        PART_WAY,
        colors.nadeSmoke,
      );
    },
  },
  {
    id: 'fire',
    vocabulary: UTILITY_NAMES.fire,
    draw: (context, colors) => {
      drawMolotovArea(
        context,
        CENTRE_X,
        CENTRE_Y,
        AREA_RADIUS_PX,
        FIRE_AREA_ALPHA,
        PART_WAY,
        colors.nadeMolotov,
        MOLOTOV_SEED,
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
