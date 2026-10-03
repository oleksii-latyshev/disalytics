import type { Lineup } from '@disa/demo-core';
import { type MapOverview, radarX, radarY } from '@disa/map-data';
import type { PlateGeometry, RadarColors } from '@/features/radar';
import { drawFlightArc } from './lineup-layer-drawing';
import {
  drawBounceMarker,
  drawDraggableHandle,
  drawLandingMarker,
  drawOriginMarker,
  drawSelectedNodeRing,
  grenadeColorOfKind,
  sideColor,
} from './lineup-layer-markers';
import {
  type ActiveDragPoint,
  isLineupNodeSelected,
  type SelectedLineupNode,
} from './lineup-nodes';
import { LINEUP_STRIDE } from './lineup-plot';

export interface LineupPainterEnv {
  readonly lineups: readonly Lineup[];
  readonly plot: Float32Array;
  readonly overview: MapOverview;
  readonly colors: RadarColors;
  readonly geometry: PlateGeometry;
  readonly isEditing: boolean;
  readonly selectedNodes: readonly SelectedLineupNode[] | undefined;
  readonly activeDrag: ActiveDragPoint | null | undefined;
}

interface Paint {
  lineup: Lineup;
  originX: number;
  originY: number;
  landingX: number;
  landingY: number;
  alpha: number;
  lineWidth: number;
  isFocused: boolean;
  utilityColor: string;
}

export type LineupPainter = (
  context: CanvasRenderingContext2D,
  index: number,
  alpha: number,
  lineWidth: number,
  isFocused: boolean,
) => void;

function readPoints(env: LineupPainterEnv, index: number, paint: Paint): void {
  const { scale } = env.geometry;
  const base = index * LINEUP_STRIDE;
  paint.originX = (env.plot[base] ?? 0) * scale;
  paint.originY = (env.plot[base + 1] ?? 0) * scale;
  paint.landingX = (env.plot[base + 2] ?? 0) * scale;
  paint.landingY = (env.plot[base + 3] ?? 0) * scale;

  const drag = env.activeDrag;
  if (!paint.isFocused || !drag) return;
  if (drag.target === 'origin') {
    paint.originX = drag.radarX * scale;
    paint.originY = drag.radarY * scale;
  } else if (drag.target === 'landing') {
    paint.landingX = drag.radarX * scale;
    paint.landingY = drag.radarY * scale;
  }
}

function draggedWaypoint(
  env: LineupPainterEnv,
  isFocused: boolean,
  waypointIndex: number,
): ActiveDragPoint | null {
  const drag = env.activeDrag;
  if (!isFocused || drag?.target !== 'waypoint' || drag.waypointIndex !== waypointIndex) {
    return null;
  }
  return drag;
}

function drawWaypoint(
  context: CanvasRenderingContext2D,
  env: LineupPainterEnv,
  paint: Paint,
  waypointIndex: number,
  x: number,
  y: number,
): void {
  const { scale } = env.geometry;
  const isSelected = isLineupNodeSelected(
    env.selectedNodes,
    paint.lineup.id,
    'waypoint',
    waypointIndex,
  );
  context.globalAlpha = isSelected ? 1 : paint.alpha;
  drawBounceMarker(context, x, y, scale, paint.utilityColor, paint.isFocused, waypointIndex);
  if (isSelected) drawSelectedNodeRing(context, x, y, '#ffffff', 'waypoint');
  if (paint.isFocused && env.isEditing) {
    drawDraggableHandle(context, x, y, scale, env.colors.selectionRing);
  }
}

function drawFlightPath(
  context: CanvasRenderingContext2D,
  env: LineupPainterEnv,
  paint: Paint,
): void {
  const { scale } = env.geometry;
  const { lineWidth, utilityColor, isFocused } = paint;
  const waypoints = paint.lineup.waypoints ?? [];
  let previousX = paint.originX;
  let previousY = paint.originY;

  for (let w = 0; w < waypoints.length; w++) {
    const waypoint = waypoints[w];
    if (waypoint === undefined) continue;
    const dragged = draggedWaypoint(env, isFocused, w);
    const x = (dragged?.radarX ?? radarX(env.overview, waypoint.x)) * scale;
    const y = (dragged?.radarY ?? radarY(env.overview, waypoint.y)) * scale;
    drawFlightArc(context, previousX, previousY, x, y, scale, lineWidth, utilityColor, false);
    drawWaypoint(context, env, paint, w, x, y);
    previousX = x;
    previousY = y;
  }

  if (waypoints.length > 0) context.globalAlpha = paint.alpha;
  drawFlightArc(
    context,
    previousX,
    previousY,
    paint.landingX,
    paint.landingY,
    scale,
    lineWidth,
    utilityColor,
    isFocused,
  );
}

function drawEndpoints(
  context: CanvasRenderingContext2D,
  env: LineupPainterEnv,
  paint: Paint,
): void {
  const { scale } = env.geometry;
  const { colors, overview } = env;
  const { lineup, isFocused, alpha, utilityColor } = paint;
  const isOriginSelected = isLineupNodeSelected(env.selectedNodes, lineup.id, 'origin');
  const isLandingSelected = isLineupNodeSelected(env.selectedNodes, lineup.id, 'landing');

  context.globalAlpha = isOriginSelected ? 1 : alpha;
  drawOriginMarker(
    context,
    paint.originX,
    paint.originY,
    scale,
    sideColor(lineup.side, colors),
    colors.selectionRing,
    isFocused,
  );
  if (isOriginSelected) {
    drawSelectedNodeRing(context, paint.originX, paint.originY, colors.selectionRing, 'origin');
  }

  context.globalAlpha = isLandingSelected ? 1 : alpha;
  drawLandingMarker(
    context,
    paint.landingX,
    paint.landingY,
    scale,
    lineup.kind,
    overview.scale,
    utilityColor,
    isFocused,
  );
  if (isLandingSelected) {
    drawSelectedNodeRing(context, paint.landingX, paint.landingY, utilityColor, 'landing');
  }

  if (isFocused && env.isEditing) {
    drawDraggableHandle(context, paint.originX, paint.originY, scale, colors.selectionRing);
    drawDraggableHandle(context, paint.landingX, paint.landingY, scale, utilityColor);
  }
}

/** The scratch `Paint` is reused across lineups, so a paint pass allocates nothing. */
export function createLineupPainter(env: LineupPainterEnv): LineupPainter {
  const first = env.lineups[0];
  if (first === undefined) return () => {};
  const paint: Paint = {
    lineup: first,
    originX: 0,
    originY: 0,
    landingX: 0,
    landingY: 0,
    alpha: 0,
    lineWidth: 0,
    isFocused: false,
    utilityColor: '',
  };

  return (context, index, alpha, lineWidth, isFocused) => {
    const lineup = env.lineups[index];
    if (lineup === undefined) return;

    paint.lineup = lineup;
    paint.alpha = alpha;
    paint.lineWidth = lineWidth;
    paint.isFocused = isFocused;
    paint.utilityColor = grenadeColorOfKind(lineup.kind, env.colors);
    readPoints(env, index, paint);

    context.globalAlpha = alpha;
    drawFlightPath(context, env, paint);
    drawEndpoints(context, env, paint);
    context.globalAlpha = alpha;
  };
}
