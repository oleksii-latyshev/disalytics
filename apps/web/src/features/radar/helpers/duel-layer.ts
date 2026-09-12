import { type Duel, sampleAt, type Team, type TickTrack } from '@disa/demo-core';
import { type MapOverview, RADAR_IMAGE_SIZE } from '@disa/map-data';
import type { Layer } from '@/core/renderer';
import type { RadarColors } from './colors';
import {
  drawKillFall,
  drawKillOrigin,
  drawKillPath,
  END_STRIDE,
  ENDS_LENGTH,
  killLineGeometry,
} from './kill-line';
import { type PlateView, plateGeometry, readPlateGeometry } from './view';

/**
 * What a match's worth of marks keeps of one mark's own opacity.
 *
 * §5.4's line is drawn one at a time, over a plate the reader is watching, and at that strength a
 * whole match of them is a ball of wool: the map underneath stops being readable, which is the one
 * thing this screen cannot afford to lose. The marks themselves are unchanged — this is the only
 * number that separates one duel from two hundred of them.
 */
const MATCH_ALPHA = 0.7;

/**
 * Where every duel's two ends fall on the radar image, computed once for a list of duels.
 *
 * It is `killLineGeometry` run at scale 1 and copied out, rather than a second reader of
 * `TickTrack`: the rule for where a kill's ends are — the kill's own frame, the level each end
 * stands on — is one rule, and this is a match's worth of the same question §5.4 asks about one.
 *
 * The draw then multiplies by the plate's scale, so resizing the screen re-reads nothing.
 */
export function duelPlot(
  track: TickTrack,
  overview: MapOverview,
  levelIndex: number,
  duels: readonly Duel[],
): Float32Array {
  const geometry = killLineGeometry(track, overview, levelIndex);
  const plot = new Float32Array(duels.length * ENDS_LENGTH);

  duels.forEach((duel, index) => {
    geometry.read(duel, 1);
    plot.set(geometry.ends, index * ENDS_LENGTH);
  });

  return plot;
}

export interface DuelLayerOptions {
  readonly duels: readonly Duel[];
  /** `duelPlot` of exactly those duels, in the same order. */
  readonly plot: Float32Array;
  readonly colors: RadarColors;
  /** Read at draw time, the way every layer on the plate reads it. */
  readonly view: { readonly current: PlateView };
}

/**
 * Every duel in the match at once: a ring where each shot came from, a disc where the player fell,
 * and a line between them — §5.4's three marks, drawn over a whole match rather than over one
 * hovered row.
 *
 * **Nothing here is a function of time.** There is no clock on this screen, so the layer paints when
 * its duels change or the canvas is resized, and the positions it draws were resolved before it was
 * built. Nothing in the draw allocates: the plot is a typed array and the sides are read off the
 * duel that owns them.
 */
export function duelLayer(options: DuelLayerOptions): Layer {
  const { duels, plot, colors, view } = options;
  const geometry = plateGeometry();

  const sideColor = (side: Team | undefined) =>
    side === undefined ? colors.dead : colors.team[side];

  return (context, size) => {
    if (duels.length === 0) return;

    readPlateGeometry(view.current, size, RADAR_IMAGE_SIZE, geometry);
    context.translate(geometry.offsetX, geometry.offsetY);

    const { scale } = geometry;

    for (const [index, duel] of duels.entries()) {
      const base = index * ENDS_LENGTH;
      const originX = sampleAt(plot, base) * scale;
      const originY = sampleAt(plot, base + 1) * scale;
      const originAlpha = sampleAt(plot, base + 2) * MATCH_ALPHA;
      const fallX = sampleAt(plot, base + END_STRIDE) * scale;
      const fallY = sampleAt(plot, base + END_STRIDE + 1) * scale;
      const fallAlpha = sampleAt(plot, base + END_STRIDE + 2) * MATCH_ALPHA;

      // A line crossing a floor the map is not showing is as faint as its fainter end — §6.3, and
      // the same rule the hovered line obeys.
      drawKillPath(
        context,
        originX,
        originY,
        fallX,
        fallY,
        Math.min(originAlpha, fallAlpha),
        colors.killLine,
      );

      drawKillOrigin(context, originX, originY, originAlpha, sideColor(duel.attackerSide));
      drawKillFall(context, fallX, fallY, fallAlpha, sideColor(duel.victimSide));
    }
  };
}
