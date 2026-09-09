import { damageFigure, drawDamageFigure } from './damage-figure';
import { drawWeaponMark, WEAPON_MARK_PX } from './equipment-marks';
import { haloStroke, LABEL_HEIGHT_PX } from './label-box';
import { drawLeaderLine, leaderStroke } from './leader-line';
import {
  CENTRE_X,
  CENTRE_Y,
  LEFT_X,
  MARK_HEIGHT_PX,
  MARK_WIDTH_PX,
  PART_WAY,
  type PlateMark,
  RIGHT_X,
} from './legend-box';
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

/** One instance for the sheet, for the reason the layer holds one: the gradient is cached in it. */
const tracer = tracerStroke();

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

/** A radius the swatch chooses, where on the plate the map's own scale does. */
const AUDIBLE_RADIUS_PX = 12;

/**
 * The hit's swatch: a token left of centre with its figure where the plate would place one, and a
 * specimen big enough to read as an exchange rather than as a graze. It is a numeral rather than a
 * message — the digits are the same reading in both locales — the way `PART_WAY` above is a phase
 * rather than a duration.
 */
const HIT_TOKEN_X = 18;
const HIT_FIGURE_X = HIT_TOKEN_X + TOKEN_RADIUS_PX + 6;
const HIT_FIGURE = damageFigure(89) ?? '';

/**
 * The leader's swatch: a token in the bottom-left corner and a label's box across the top, with the
 * line between them. The label is drawn as its own leading edge — the weapon mark the plate reserves
 * a box for — rather than as a specimen nickname, for the reason the `weapon` swatch draws a single
 * outline: a name in a 56px box is a name clipped, and what this entry has to show is the line.
 *
 * The distance is the box's rather than the plate's, the way `TRACER_LENGTH_PX` and
 * `AUDIBLE_RADIUS_PX` are: on the plate a displaced label sits up to three rows out, and three rows
 * do not fit here. The token is pinned off the bottom edge rather than typed at a height, so a
 * change to the token's radius moves it instead of clipping it.
 */
const LEADER_TOKEN_X = TOKEN_RADIUS_PX;
const LEADER_TOKEN_Y = MARK_HEIGHT_PX - TOKEN_RADIUS_PX - 1;
const LEADER_BOX_X = MARK_WIDTH_PX - WEAPON_MARK_PX;
const LEADER_BOX_Y = 0;
const LEADER_BOX_WIDTH = WEAPON_MARK_PX;

/**
 * Everything the plate draws that belongs to a *player*: the token, and every state it can be in.
 *
 * The order is `PLATE_MARKS`'s own and it is the argument rather than an accident — a reader meets
 * a token before they meet a token that has been blinded.
 */
export const TOKEN_MARKS: readonly PlateMark[] = [
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
    id: 'leader',
    draw: (context, colors) => {
      drawToken(context, LEADER_TOKEN_X, LEADER_TOKEN_Y, TOKEN_RADIUS_PX, colors.team.CT);

      leaderStroke(context, colors.label.leader);
      drawLeaderLine(
        context,
        LEADER_TOKEN_X,
        LEADER_TOKEN_Y,
        TOKEN_RADIUS_PX,
        LEADER_BOX_X,
        LEADER_BOX_Y,
        LEADER_BOX_WIDTH,
        LABEL_HEIGHT_PX,
      );

      haloStroke(context, colors.label.halo);
      drawWeaponMark(
        context,
        LEADER_BOX_X,
        LEADER_BOX_Y + LABEL_HEIGHT_PX / 2,
        'rifle',
        'ak47',
        colors.label.ink,
      );
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
];
