import {
  type GrenadeType,
  grenadeRadiusUnits,
  type Lineup,
  type LineupSide,
  type UtilityKind,
} from '@disa/demo-core';
import { type MapOverview, RADAR_IMAGE_SIZE, radarX, radarY } from '@disa/map-data';
import type { Layer } from '@/core/renderer';
import type { RadarColors } from '@/features/radar/helpers/colors';
import { type PlateView, plateGeometry, readPlateGeometry } from '@/features/radar/helpers/view';
import { LINEUP_STRIDE, type LineupGroup } from './lineup-plot';

const FULL_TURN = 2 * Math.PI;

const ORIGIN_RADIUS_PX = 3;
const LANDING_RADIUS_PX = 2.5;
const LANDING_RING_WIDTH_PX = 1;

const UNFOCUSED_ALPHA = 0.15;
const DEFAULT_ALPHA = 0.75;
const FOCUSED_ALPHA = 1.0;

export interface ActiveDragPoint {
  readonly target: 'origin' | 'landing' | 'waypoint';
  readonly waypointIndex?: number | undefined;
  readonly radarX: number;
  readonly radarY: number;
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
  readonly draftOrigin?: { readonly x: number; readonly y: number } | null | undefined;
  readonly draftWaypoints?: readonly { readonly x: number; readonly y: number }[] | undefined;
  readonly hoverPoint?: { readonly x: number; readonly y: number } | null | undefined;
  readonly hideLineups?: boolean | undefined;
  readonly activeDrag?: ActiveDragPoint | null | undefined;
}

function sideColor(side: LineupSide, colors: RadarColors): string {
  switch (side) {
    case 'CT':
      return colors.team.CT;
    case 'T':
      return colors.team.T;
    default:
      return colors.selectionRing;
  }
}

function grenadeColorOfKind(kind: UtilityKind, colors: RadarColors): string {
  switch (kind) {
    case 'he':
      return colors.nadeHe;
    case 'flash':
      return colors.blind;
    case 'smoke':
      return colors.nadeSmoke;
    case 'fire':
      return colors.nadeMolotov;
    case 'decoy':
      return colors.nadeDecoy;
    default:
      return colors.selectionRing;
  }
}

function grenadeTypeOfUtility(kind: UtilityKind): GrenadeType {
  switch (kind) {
    case 'he':
      return 'hegrenade';
    case 'flash':
      return 'flashbang';
    case 'smoke':
      return 'smokegrenade';
    case 'fire':
      return 'molotov';
    case 'decoy':
      return 'decoy';
    default:
      return 'smokegrenade';
  }
}

function drawFlightArc(
  context: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  lx: number,
  ly: number,
  scale: number,
  lineWidth: number,
  color: string,
  isFocused: boolean,
): void {
  const dx = lx - ox;
  const dy = ly - oy;
  const dist = Math.hypot(dx, dy);
  if (dist <= 1) return;

  const nx = -dy / dist;
  const ny = dx / dist;
  const curveOffset = Math.min(dist * 0.12, 28 * scale);
  const cx = (ox + lx) / 2 + nx * curveOffset;
  const cy = (oy + ly) / 2 + ny * curveOffset;

  context.lineWidth = lineWidth;
  context.strokeStyle = color;
  context.beginPath();
  context.moveTo(ox, oy);
  context.quadraticCurveTo(cx, cy, lx, ly);
  context.stroke();

  if (isFocused) {
    const angle = Math.atan2(ly - cy, lx - cx);
    const arrowSize = 6 * scale;
    context.fillStyle = color;
    context.beginPath();
    context.moveTo(lx, ly);
    context.lineTo(
      lx - arrowSize * Math.cos(angle - Math.PI / 6),
      ly - arrowSize * Math.sin(angle - Math.PI / 6),
    );
    context.lineTo(
      lx - arrowSize * Math.cos(angle + Math.PI / 6),
      ly - arrowSize * Math.sin(angle + Math.PI / 6),
    );
    context.closePath();
    context.fill();
  }
}

function drawOriginMarker(
  context: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  scale: number,
  fillColor: string,
  ringColor: string,
  isFocused: boolean,
): void {
  const radius = (isFocused ? ORIGIN_RADIUS_PX * 1.5 : ORIGIN_RADIUS_PX) * scale;
  context.fillStyle = fillColor;
  context.beginPath();
  context.arc(ox, oy, radius, 0, FULL_TURN);
  context.fill();

  if (isFocused) {
    context.lineWidth = 1.5 * scale;
    context.strokeStyle = ringColor;
    context.beginPath();
    context.arc(ox, oy, ORIGIN_RADIUS_PX * 2.5 * scale, 0, FULL_TURN);
    context.stroke();
  }
}

function drawLandingMarker(
  context: CanvasRenderingContext2D,
  lx: number,
  ly: number,
  scale: number,
  kind: UtilityKind,
  mapScale: number,
  color: string,
  isFocused: boolean,
): void {
  const dotRadius = (isFocused ? LANDING_RADIUS_PX * 1.4 : LANDING_RADIUS_PX) * scale;
  context.fillStyle = color;
  context.beginPath();
  context.arc(lx, ly, dotRadius, 0, FULL_TURN);
  context.fill();

  const radiusUnits = grenadeRadiusUnits(grenadeTypeOfUtility(kind));
  const effectRadiusPx = (radiusUnits / mapScale) * scale;
  if (effectRadiusPx > LANDING_RADIUS_PX * scale) {
    context.lineWidth = (isFocused ? LANDING_RING_WIDTH_PX * 1.5 : LANDING_RING_WIDTH_PX) * scale;
    context.strokeStyle = color;
    context.beginPath();
    context.arc(lx, ly, effectRadiusPx, 0, FULL_TURN);
    context.stroke();
  }
}

function drawGroupBadges(
  context: CanvasRenderingContext2D,
  groups: readonly LineupGroup[],
  plot: Float32Array,
  target: 'origin' | 'landing',
  scale: number,
  color: string,
  textColor: string,
): void {
  context.globalAlpha = 1;
  context.font = '600 11px Onest, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  const offset = target === 'origin' ? 0 : 2;
  for (let index = 0; index < groups.length; index++) {
    const group = groups[index];
    if (group === undefined) continue;
    if (group.indices.length < 2) continue;
    const first = group.indices[0];
    if (first === undefined) continue;
    const base = first * LINEUP_STRIDE + offset;
    const x = (plot[base] ?? 0) * scale + 10;
    const y = (plot[base + 1] ?? 0) * scale + 10;
    context.fillStyle = color;
    context.beginPath();
    context.arc(x, y, 9, 0, FULL_TURN);
    context.fill();
    context.fillStyle = textColor;
    context.fillText(group.countLabel, x, y + 0.5);
  }
}

function drawBounceMarker(
  context: CanvasRenderingContext2D,
  bx: number,
  by: number,
  scale: number,
  color: string,
  isFocused: boolean,
  index?: number,
): void {
  const dotRadius = (isFocused ? 3.5 : 2.5) * scale;
  context.fillStyle = color;
  context.beginPath();
  context.arc(bx, by, dotRadius, 0, FULL_TURN);
  context.fill();

  context.lineWidth = 1.2 * scale;
  context.strokeStyle = '#ffffff';
  context.beginPath();
  context.arc(bx, by, (isFocused ? 5.5 : 4) * scale, 0, FULL_TURN);
  context.stroke();

  if (isFocused && index !== undefined) {
    context.fillStyle = '#ffffff';
    context.font = '600 10px Onest, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'bottom';
    context.fillText(String(index + 1), bx, by - 6 * scale);
  }
}

function drawDraggableHandle(
  context: CanvasRenderingContext2D,
  hx: number,
  hy: number,
  scale: number,
  color: string,
): void {
  context.lineWidth = 1.5 * scale;
  context.strokeStyle = color;
  context.setLineDash([3 * scale, 2.5 * scale]);
  context.beginPath();
  context.arc(hx, hy, 9 * scale, 0, FULL_TURN);
  context.stroke();
  context.setLineDash([]);
}

function drawFlightTrajectory(
  context: CanvasRenderingContext2D,
  points: readonly { readonly x: number; readonly y: number }[],
  scale: number,
  lineWidth: number,
  color: string,
  isFocused: boolean,
): void {
  if (points.length < 2) return;
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    if (p1 === undefined || p2 === undefined) continue;
    const isLastSegment = i === points.length - 2;
    drawFlightArc(
      context,
      p1.x,
      p1.y,
      p2.x,
      p2.y,
      scale,
      lineWidth,
      color,
      isFocused && isLastSegment,
    );
  }
}

function drawDraftPlacement(
  context: CanvasRenderingContext2D,
  draftOrigin: { readonly x: number; readonly y: number } | null | undefined,
  draftWaypoints: readonly { readonly x: number; readonly y: number }[] | undefined,
  hoverPoint: { readonly x: number; readonly y: number } | null | undefined,
  overview: MapOverview,
  scale: number,
  colors: RadarColors,
): void {
  if (!draftOrigin) return;
  context.globalAlpha = 1;
  const ox = radarX(overview, draftOrigin.x) * scale;
  const oy = radarY(overview, draftOrigin.y) * scale;

  drawOriginMarker(context, ox, oy, scale, colors.selectionRing, colors.selectionRing, true);
  drawDraggableHandle(context, ox, oy, scale, colors.selectionRing);

  const points: { x: number; y: number }[] = [{ x: ox, y: oy }];
  if (draftWaypoints && draftWaypoints.length > 0) {
    for (let i = 0; i < draftWaypoints.length; i++) {
      const wp = draftWaypoints[i];
      if (!wp) continue;
      const wx = radarX(overview, wp.x) * scale;
      const wy = radarY(overview, wp.y) * scale;
      points.push({ x: wx, y: wy });
      drawBounceMarker(context, wx, wy, scale, colors.selectionRing, true, i);
      drawDraggableHandle(context, wx, wy, scale, colors.selectionRing);
    }
  }

  if (hoverPoint) {
    const hx = radarX(overview, hoverPoint.x) * scale;
    const hy = radarY(overview, hoverPoint.y) * scale;
    const lastPoint = points[points.length - 1] ?? { x: ox, y: oy };
    drawFlightArc(
      context,
      lastPoint.x,
      lastPoint.y,
      hx,
      hy,
      scale,
      1.5 * scale,
      colors.selectionRing,
      true,
    );
    drawLandingMarker(context, hx, hy, scale, 'smoke', overview.scale, colors.selectionRing, true);
  }

  if (points.length > 1) {
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      if (p1 && p2) {
        drawFlightArc(
          context,
          p1.x,
          p1.y,
          p2.x,
          p2.y,
          scale,
          2 * scale,
          colors.selectionRing,
          false,
        );
      }
    }
  }
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

    const waypoints: { x: number; y: number }[] = [];
    if (lineup.waypoints && lineup.waypoints.length > 0) {
      for (let w = 0; w < lineup.waypoints.length; w++) {
        const wp = lineup.waypoints[w];
        if (wp === undefined) continue;
        let wx = radarX(overview, wp.x) * scale;
        let wy = radarY(overview, wp.y) * scale;
        if (
          isFocused &&
          activeDrag &&
          activeDrag.target === 'waypoint' &&
          activeDrag.waypointIndex === w
        ) {
          wx = activeDrag.radarX * scale;
          wy = activeDrag.radarY * scale;
        }
        waypoints.push({ x: wx, y: wy });
      }
    }

    context.globalAlpha = alpha;

    if (waypoints.length > 0) {
      const trajectory = [{ x: ox, y: oy }, ...waypoints, { x: lx, y: ly }];
      drawFlightTrajectory(context, trajectory, scale, lineWidth, utilityColor, isFocused);
      for (let w = 0; w < waypoints.length; w++) {
        const wp = waypoints[w];
        if (wp) {
          drawBounceMarker(context, wp.x, wp.y, scale, utilityColor, isFocused, w);
          if (isFocused) {
            drawDraggableHandle(context, wp.x, wp.y, scale, colors.selectionRing);
          }
        }
      }
    } else {
      drawFlightArc(context, ox, oy, lx, ly, scale, lineWidth, utilityColor, isFocused);
    }

    drawOriginMarker(context, ox, oy, scale, originFill, colors.selectionRing, isFocused);
    drawLandingMarker(context, lx, ly, scale, lineup.kind, overview.scale, utilityColor, isFocused);

    if (isFocused) {
      drawDraggableHandle(context, ox, oy, scale, colors.selectionRing);
      drawDraggableHandle(context, lx, ly, scale, utilityColor);
    }
  };

  return (context, size) => {
    readPlateGeometry(view.current, size, RADAR_IMAGE_SIZE, geometry);
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
