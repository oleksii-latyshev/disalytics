import type { Lineup } from '@disa/demo-core';
import { type MapOverview, radarX, radarY } from '@disa/map-data';
import type { Layer } from '@/core/renderer';
import type { RadarColors } from '@/features/radar/helpers/colors';
import {
  type PlateView,
  plateGeometry,
  readPlateGeometry,
  SQUARE_PLATE,
} from '@/features/radar/helpers/view';
import { drawDraftPlacement, drawFlightArc } from './lineup-layer-drawing';
import {
  drawBounceMarker,
  drawDraggableHandle,
  drawGroupBadges,
  drawLandingMarker,
  drawOriginMarker,
  drawSelectedNodeRing,
  grenadeColorOfKind,
  sideColor,
} from './lineup-layer-markers';
import { LINEUP_STRIDE, type LineupGroup, type LineupNode } from './lineup-plot';

const UNFOCUSED_ALPHA = 0.15;
const DEFAULT_ALPHA = 0.75;
const FOCUSED_ALPHA = 1.0;

export interface ActiveDragPoint {
  readonly target: 'origin' | 'landing' | 'waypoint';
  readonly waypointIndex?: number | undefined;
  readonly radarX: number;
  readonly radarY: number;
}

export interface SelectedLineupNode extends LineupNode {
  readonly lineupId: string;
}

export function isLineupNodeSelected(
  selectedNodes: readonly SelectedLineupNode[] | undefined,
  lineupId: string,
  target: LineupNode['target'],
  waypointIndex?: number,
): boolean {
  if (selectedNodes === undefined) return false;
  for (const node of selectedNodes) {
    if (
      node.lineupId === lineupId &&
      node.target === target &&
      (target !== 'waypoint' || node.waypointIndex === waypointIndex)
    ) {
      return true;
    }
  }
  return false;
}

export interface LineupLayerOptions {
  readonly lineups: readonly Lineup[];
  readonly plot: Float32Array;
  readonly groups: readonly LineupGroup[];
  readonly landingGroups?: readonly LineupGroup[] | undefined;
  readonly overview: MapOverview;
  readonly colors: RadarColors;
  readonly view: { readonly current: PlateView };
  readonly focused: number | null;
  readonly mode?: 'view' | 'edit' | undefined;
  readonly selectedNodes?: readonly SelectedLineupNode[] | undefined;
  readonly draftOrigin?: { readonly x: number; readonly y: number } | null | undefined;
  readonly draftWaypoints?: readonly { readonly x: number; readonly y: number }[] | undefined;
  readonly hoverPoint?: { readonly x: number; readonly y: number } | null | undefined;
  readonly hideLineups?: boolean | undefined;
  readonly activeDrag?: ActiveDragPoint | null | undefined;
}

/**
 * Draws grenade lineups across the radar map:
 * - An origin marker where the player stands (color-coded by side).
 * - A curved trajectory flight arc from origin to landing (with optional bounce waypoints).
 * - A landing marker with the grenade's effect radius ring.
 *
 * Lineups are drawn deterministically with zero allocations during paint.
 */
export function lineupLayer(options: LineupLayerOptions): Layer {
  const {
    lineups,
    plot,
    groups,
    landingGroups,
    overview,
    colors,
    view,
    focused,
    mode = 'view',
    selectedNodes,
    draftOrigin,
    draftWaypoints,
    hoverPoint,
    hideLineups,
    activeDrag,
  } = options;
  const geometry = plateGeometry();

  const drawLineup = (
    context: CanvasRenderingContext2D,
    index: number,
    alpha: number,
    lineWidth: number,
    isFocused: boolean,
  ) => {
    const lineup = lineups[index];
    if (lineup === undefined) return;

    const { scale } = geometry;
    const base = index * LINEUP_STRIDE;
    let ox = (plot[base] ?? 0) * scale;
    let oy = (plot[base + 1] ?? 0) * scale;
    let lx = (plot[base + 2] ?? 0) * scale;
    let ly = (plot[base + 3] ?? 0) * scale;

    if (isFocused && activeDrag) {
      if (activeDrag.target === 'origin') {
        ox = activeDrag.radarX * scale;
        oy = activeDrag.radarY * scale;
      } else if (activeDrag.target === 'landing') {
        lx = activeDrag.radarX * scale;
        ly = activeDrag.radarY * scale;
      }
    }

    const utilityColor = grenadeColorOfKind(lineup.kind, colors);
    const originFill = sideColor(lineup.side, colors);

    const isOriginSelected = isLineupNodeSelected(selectedNodes, lineup.id, 'origin');
    const isLandingSelected = isLineupNodeSelected(selectedNodes, lineup.id, 'landing');

    context.globalAlpha = alpha;

    const waypoints = lineup.waypoints;
    if (waypoints && waypoints.length > 0) {
      let previousX = ox;
      let previousY = oy;
      for (let w = 0; w < waypoints.length; w++) {
        const waypoint = waypoints[w];
        if (waypoint === undefined) continue;
        let waypointX = radarX(overview, waypoint.x) * scale;
        let waypointY = radarY(overview, waypoint.y) * scale;
        if (isFocused && activeDrag?.target === 'waypoint' && activeDrag.waypointIndex === w) {
          waypointX = activeDrag.radarX * scale;
          waypointY = activeDrag.radarY * scale;
        }
        drawFlightArc(
          context,
          previousX,
          previousY,
          waypointX,
          waypointY,
          scale,
          lineWidth,
          utilityColor,
          false,
        );
        const isSelected = isLineupNodeSelected(selectedNodes, lineup.id, 'waypoint', w);
        context.globalAlpha = isSelected ? 1 : alpha;
        drawBounceMarker(context, waypointX, waypointY, scale, utilityColor, isFocused, w);
        if (isSelected) {
          drawSelectedNodeRing(context, waypointX, waypointY, '#ffffff', 'waypoint');
        }
        if (isFocused && mode === 'edit') {
          drawDraggableHandle(context, waypointX, waypointY, scale, colors.selectionRing);
        }
        previousX = waypointX;
        previousY = waypointY;
      }
      context.globalAlpha = alpha;
      drawFlightArc(
        context,
        previousX,
        previousY,
        lx,
        ly,
        scale,
        lineWidth,
        utilityColor,
        isFocused,
      );
    } else {
      drawFlightArc(context, ox, oy, lx, ly, scale, lineWidth, utilityColor, isFocused);
    }

    context.globalAlpha = isOriginSelected ? 1 : alpha;
    drawOriginMarker(context, ox, oy, scale, originFill, colors.selectionRing, isFocused);
    if (isOriginSelected) {
      drawSelectedNodeRing(context, ox, oy, colors.selectionRing, 'origin');
    }

    context.globalAlpha = isLandingSelected ? 1 : alpha;
    drawLandingMarker(context, lx, ly, scale, lineup.kind, overview.scale, utilityColor, isFocused);
    if (isLandingSelected) {
      drawSelectedNodeRing(context, lx, ly, utilityColor, 'landing');
    }

    if (isFocused && mode === 'edit') {
      drawDraggableHandle(context, ox, oy, scale, colors.selectionRing);
      drawDraggableHandle(context, lx, ly, scale, utilityColor);
    }
    context.globalAlpha = alpha;
  };

  return (context, size) => {
    readPlateGeometry(view.current, size, SQUARE_PLATE, geometry);
    context.translate(geometry.offsetX, geometry.offsetY);

    if (!hideLineups) {
      const isAnyFocused = focused !== null;
      const baseAlpha = isAnyFocused ? UNFOCUSED_ALPHA : DEFAULT_ALPHA;
      const baseWidth = isAnyFocused ? 1 : 1.5;

      for (let i = 0; i < lineups.length; i++) {
        if (i !== focused) {
          drawLineup(context, i, baseAlpha, baseWidth * geometry.scale, false);
        }
      }

      if (focused !== null) {
        drawLineup(context, focused, FOCUSED_ALPHA, 2.5 * geometry.scale, true);
      }

      drawGroupBadges(
        context,
        groups,
        plot,
        'origin',
        geometry.scale,
        colors.selectionRing,
        colors.selectionEdge,
      );
      if (landingGroups && landingGroups.length > 0) {
        drawGroupBadges(
          context,
          landingGroups,
          plot,
          'landing',
          geometry.scale,
          colors.selectionRing,
          colors.selectionEdge,
        );
      }
    }

    drawDraftPlacement(
      context,
      draftOrigin,
      draftWaypoints,
      hoverPoint,
      overview,
      geometry.scale,
      colors,
    );
  };
}
