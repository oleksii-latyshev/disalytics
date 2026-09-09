import { FIRE_AREA_ALPHA, SMOKE_AREA_ALPHA, UTILITY_NAMES } from '@disa/demo-core';
import { drawGrenadeMark } from './equipment-marks';
import { drawDecoyPulse, drawFlashMark, drawHeRing, trajectoryStroke } from './grenades';
import { drawKillFall, drawKillOrigin, drawKillPath } from './kill-line';
import {
  CENTRE_X,
  CENTRE_Y,
  LEFT_X,
  MARK_HEIGHT_PX,
  MARK_WIDTH_PX,
  type PlateMark,
  RIGHT_X,
} from './legend-box';
import { bodyParts, drawFireBody, drawSmokeBody } from './utility-body';

/**
 * The two bodies the legend draws, laid out by the plate's own function so a swatch cannot show a
 * shape the map never draws. Index 0 is the smoke and index 1 the fire — the order is the argument.
 */
const LEGEND_BODIES = bodyParts([{ type: 'smokegrenade' }, { type: 'molotov' }]);

/** A radius the swatch chooses, where on the plate the grenade's own model does. */
const AREA_RADIUS_PX = 11;

/**
 * Everything the plate draws that records an *event* rather than a person: what was thrown, where
 * it went off, and the line a kill leaves behind.
 */
export const EVENT_MARKS: readonly PlateMark[] = [
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
