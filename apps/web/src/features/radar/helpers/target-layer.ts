import { sampleAt } from '@disa/demo-core';
import { type MapOverview, plateLayout } from '@disa/map-data';
import type { Layer } from '@/core/renderer';
import type { RadarColors } from './colors';
import { type PlateView, plateGeometry, readPlateGeometry } from './view';

const FULL_TURN = 2 * Math.PI;

/** How much of the map the picked target leaves to read: a lineup is the reading, the map is not. */
const DIM_ALPHA = 0.45;

/** Throws on the move, quiet: a match of them is a field, and none of them can be repeated. */
const DOT_RADIUS_PX = 2.5;
const DOT_ALPHA = 0.55;

const LANDING_FILL_ALPHA = 0.2;
const LANDING_RING_WIDTH_PX = 2;

/** How far an arc bows off the straight line, as a share of its length — enough to read as thrown. */
const ARC_BOW = 0.18;
const ARC_WIDTH_PX = 1.5;
const ARC_ACTIVE_WIDTH_PX = 3;
const ARC_UNDERLAY_EXTRA_PX = 3;
const ARC_ALPHA = 0.5;

/** Allocated once: `setLineDash` takes an array, and a draw does not make one. */
const SOLID_DASH: number[] = [];
const ARC_DASH: number[] = [6, 6];
const ARC_ACTIVE_DASH: number[] = [10, 6];

export interface DotPlot {
  /** Plate `x`, plate `y` per dot. */
  readonly plot: Float32Array;
  /** One colour per dot, resolved once rather than in the draw. */
  readonly colors: readonly string[];
}

export interface SelectionPlot {
  readonly landingX: number;
  readonly landingY: number;
  /** The extent of what the grenade covers, in radar pixels. */
  readonly radiusPlatePx: number;
  readonly color: string;
  /** Plate `x`, plate `y` of each origin, in variant order. */
  readonly origins: Float32Array;
  /** The origin whose arc is drawn in full, by index. */
  readonly active: number;
}

export interface TargetLayerOptions {
  readonly overview: MapOverview;
  readonly colors: RadarColors;
  readonly view: { readonly current: PlateView };
  readonly dots: DotPlot;
  readonly selection: SelectionPlot | null;
}

function drawArc(
  context: CanvasRenderingContext2D,
  index: number,
  scale: number,
  selected: SelectionPlot,
  colors: RadarColors,
): void {
  const ox = sampleAt(selected.origins, index * 2) * scale;
  const oy = sampleAt(selected.origins, index * 2 + 1) * scale;
  const lx = selected.landingX * scale;
  const ly = selected.landingY * scale;
  const dx = lx - ox;
  const dy = ly - oy;
  const isActive = index === selected.active;
  const width = isActive ? ARC_ACTIVE_WIDTH_PX : ARC_WIDTH_PX;

  context.globalAlpha = isActive ? 1 : ARC_ALPHA;
  context.lineCap = 'round';

  for (let pass = 0; pass < 2; pass++) {
    context.beginPath();
    context.moveTo(ox, oy);
    context.quadraticCurveTo((ox + lx) / 2 - dy * ARC_BOW, (oy + ly) / 2 + dx * ARC_BOW, lx, ly);
    context.lineWidth = pass === 0 ? width + ARC_UNDERLAY_EXTRA_PX : width;
    context.strokeStyle = pass === 0 ? colors.hollow : colors.selectionRing;
    context.setLineDash(pass === 0 ? SOLID_DASH : isActive ? ARC_ACTIVE_DASH : ARC_DASH);
    context.stroke();
  }

  context.setLineDash(SOLID_DASH);
}

function drawDots(
  context: CanvasRenderingContext2D,
  scale: number,
  dots: DotPlot,
  fallback: string,
): void {
  context.globalAlpha = DOT_ALPHA;

  for (let index = 0; index < dots.colors.length; index++) {
    context.fillStyle = dots.colors[index] ?? fallback;
    context.beginPath();
    context.arc(
      sampleAt(dots.plot, index * 2) * scale,
      sampleAt(dots.plot, index * 2 + 1) * scale,
      DOT_RADIUS_PX,
      0,
      FULL_TURN,
    );
    context.fill();
  }
}

function drawSelection(
  context: CanvasRenderingContext2D,
  scale: number,
  picked: SelectionPlot,
  colors: RadarColors,
): void {
  context.globalAlpha = LANDING_FILL_ALPHA;
  context.fillStyle = picked.color;
  context.beginPath();
  context.arc(
    picked.landingX * scale,
    picked.landingY * scale,
    picked.radiusPlatePx * scale,
    0,
    FULL_TURN,
  );
  context.fill();

  context.globalAlpha = 1;
  context.lineWidth = LANDING_RING_WIDTH_PX;
  context.strokeStyle = picked.color;
  context.stroke();

  const count = picked.origins.length / 2;
  for (let index = 0; index < count; index++) {
    if (index !== picked.active) drawArc(context, index, scale, picked, colors);
  }
  if (picked.active < count) drawArc(context, picked.active, scale, picked, colors);
}

/**
 * What the lineups view draws on the canvas: the throws on the move as quiet dots, and for a picked
 * target the ground its grenade covers with an arc from every origin to it.
 *
 * The markers, the numbers on the origins and the stack menu are elements over this canvas rather
 * than drawn on it: each is a control, and a canvas has no focus order for a keyboard to walk.
 * **Nothing here is a function of time**, so it paints when its inputs change or the canvas is
 * resized; nothing in the draw allocates.
 */
export function targetLayer(options: TargetLayerOptions): Layer {
  const { overview, colors, view, dots, selection } = options;
  const geometry = plateGeometry();
  const plateSize = plateLayout(overview);

  return (context, size) => {
    readPlateGeometry(view.current, size, plateSize, geometry);
    const { scale } = geometry;
    context.translate(geometry.offsetX, geometry.offsetY);

    if (selection !== null) {
      context.globalAlpha = DIM_ALPHA;
      context.fillStyle = colors.hollow;
      context.fillRect(0, 0, plateSize.width * scale, plateSize.height * scale);
    }

    drawDots(context, scale, dots, colors.dead);
    if (selection !== null) drawSelection(context, scale, selection, colors);
  };
}
