import { sampleAt, type Team } from '@disa/demo-core';
import type { Layer } from '@/core/renderer';
import { readCssToken } from '@/shared/lib';
import type { EventDensity } from './density';
import type { EconomyStep } from './economy';
import type { MatchKill } from './kills';
import type { RoundBand } from './spine';

/** Low enough that a full-height tint reads as the round's outcome rather than as a surface. */
const BAND_ALPHA = 0.14;

/**
 * `docs/DESIGN.md` §7.3. The playhead is the brightest thing on screen and nothing else is allowed
 * to be, and this is an aggregate rather than damage — §2.4 forbids spending a semantic colour on
 * "how much happened in this minute", and monochrome is also what makes the trace read as terrain.
 */
const DENSITY_ALPHA = 0.3;

/**
 * Above the bands: they fill their surface at 0.14, and a gap that has to be seen against a band
 * tinted the same hue cannot go lower.
 */
const ECONOMY_ALPHA = 0.32;

/**
 * How far an economy block may leave its centre line, as a share of the half it has. A fraction
 * rather than the four pixels the 14px ribbon fixed it at: the same layer now draws into a band of
 * the match overlay that is tens of pixels tall, and four of them there is not a chart.
 */
const ECONOMY_REACH = 0.9;

/** One kill, thin enough that a busy round reads as a comb rather than as a block. */
const KILL_MARK_WIDTH_PX = 2;
const KILL_MARK_ALPHA = 0.75;

export interface SpineColors {
  readonly side: Readonly<Record<Team, string>>;
  readonly hairline: string;
  readonly density: string;
  readonly edge: string;
}

export function readSpineColors(): SpineColors {
  return {
    side: { CT: readCssToken('--color-ct'), T: readCssToken('--color-t') },
    hairline: readCssToken('--color-line'),
    density: readCssToken('--color-ink-dim'),
    edge: readCssToken('--color-glass-edge'),
  };
}

/**
 * One band per round, tinted by its winner. The round being played is skipped: §7.3 lights it by
 * dropping the tint and framing it instead, so the frame has bare ground to sit on.
 */
export function outcomeBands(
  bands: readonly RoundBand[],
  colors: SpineColors,
  litRound: number | undefined,
): Layer {
  return (context, size) => {
    context.globalAlpha = BAND_ALPHA;

    for (const band of bands) {
      if (band.round === litRound) continue;

      const left = band.startFraction * size.width;

      context.fillStyle = colors.side[band.winner];
      context.fillRect(left, 0, band.endFraction * size.width - left, size.height);
    }
  };
}

/** The round being played, lit by a 1px rim rather than by a brighter fill. */
export function currentRoundFrame(
  bands: readonly RoundBand[],
  colors: SpineColors,
  litRound: number | undefined,
): Layer {
  return (context, size) => {
    const band = bands.find((candidate) => candidate.round === litRound);
    if (band === undefined) return;

    const left = Math.round(band.startFraction * size.width);
    const width = Math.round(band.endFraction * size.width) - left;

    context.strokeStyle = colors.edge;
    context.lineWidth = 1;
    context.strokeRect(left + 0.5, 0.5, Math.max(width - 1, 1), size.height - 1);
  };
}

export function roundHairlines(bands: readonly RoundBand[], colors: SpineColors): Layer {
  return (context, size) => {
    context.fillStyle = colors.hairline;

    for (const band of bands) {
      context.fillRect(Math.round(band.startFraction * size.width), 0, 1, size.height);
    }
  };
}

function peakBetween(perSecond: Float32Array, first: number, last: number): number {
  let peak = 0;

  for (let second = first; second <= last && second < perSecond.length; second++) {
    const value = sampleAt(perSecond, second);
    if (value > peak) peak = value;
  }

  return peak;
}

/**
 * A seismograph of the loud moments: one bar per pixel column, as tall as the loudest second that
 * column covers. Resolving the series against the column rather than the second is what keeps a
 * forty-minute match from collapsing into a smear on a strip a thousand pixels wide.
 *
 * It rises from the bottom edge of whatever it is given, which is what makes it read as terrain
 * under the round bands rather than as a second chart competing with them.
 */
export function densityTrace(density: EventDensity, colors: SpineColors): Layer {
  return (context, size) => {
    const { perSecond, durationSeconds } = density;
    if (perSecond.length === 0 || durationSeconds <= 0) return;

    const baseline = size.height;
    const columns = Math.round(size.width);

    context.fillStyle = colors.density;
    context.globalAlpha = DENSITY_ALPHA;
    context.beginPath();

    for (let column = 0; column < columns; column++) {
      const first = Math.floor((column / columns) * durationSeconds);
      const last = Math.floor(((column + 1) / columns) * durationSeconds);
      const peak = peakBetween(perSecond, first, last);

      if (peak === 0) continue;

      context.rect(column, baseline - peak * baseline, 1, peak * baseline);
    }

    context.fill();
  };
}

/**
 * One mark per kill, hanging from the top of whatever band it is given, tinted by the side of the
 * player who died — §7.1's rule for a kill, at the scale of a whole match.
 *
 * It is a layer rather than the row of buttons #91 shipped for the same reading. That row cost 5 fps
 * and took the worst scrub frame from 13 ms to 25 ms on a 264 MB demo, and a match's kills as DOM is
 * the shape of that cost rather than an accident of it.
 */
export function killMarks(kills: readonly MatchKill[], colors: SpineColors): Layer {
  return (context, size) => {
    context.globalAlpha = KILL_MARK_ALPHA;

    for (const kill of kills) {
      context.fillStyle = kill.side === undefined ? colors.density : colors.side[kill.side];
      context.fillRect(Math.round(kill.fraction * size.width), 0, KILL_MARK_WIDTH_PX, size.height);
    }
  };
}

/**
 * The buy, as one step per round leaving the chart's centre line: a block rising for a round the
 * CT side out-equipped, falling for one the T side did, as tall as the gap is wide against the
 * widest the match holds.
 *
 * Which side is ahead is carried by the direction the block leaves the centre line, not by the
 * colour it is drawn in — `docs/DESIGN.md` §9 does not let side identity rest on hue.
 */
export function economyGap(steps: readonly EconomyStep[], colors: SpineColors): Layer {
  return (context, size) => {
    if (steps.length === 0) return;

    const centre = size.height / 2;
    const reach = centre * ECONOMY_REACH;

    context.globalAlpha = ECONOMY_ALPHA;

    for (const step of steps) {
      if (step.leader === null) continue;

      const left = step.startFraction * size.width;
      const height = step.share * reach;

      context.fillStyle = colors.side[step.leader];
      context.fillRect(
        left,
        step.leader === 'CT' ? centre - height : centre,
        step.endFraction * size.width - left,
        height,
      );
    }

    context.globalAlpha = 1;
    context.fillStyle = colors.hairline;
    context.fillRect(0, Math.round(centre), size.width, 1);
  };
}
