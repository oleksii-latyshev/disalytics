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
import { LINEUP_STRIDE, type LineupOriginGroup } from './lineup-plot';

const FULL_TURN = 2 * Math.PI;

const ORIGIN_RADIUS_PX = 3;
const LANDING_RADIUS_PX = 2.5;
const LANDING_RING_WIDTH_PX = 1;

const UNFOCUSED_ALPHA = 0.15;
const DEFAULT_ALPHA = 0.75;
const FOCUSED_ALPHA = 1.0;

export interface LineupLayerOptions {
  readonly lineups: readonly Lineup[];
  readonly plot: Float32Array;
  readonly groups: readonly LineupOriginGroup[];
  readonly overview: MapOverview;
  readonly colors: RadarColors;
  readonly view: { readonly current: PlateView };
  readonly focused: number | null;
  readonly draftOrigin?: { readonly x: number; readonly y: number } | null | undefined;
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
  groups: readonly LineupOriginGroup[],
  plot: Float32Array,
  scale: number,
  color: string,
  textColor: string,
): void {
  context.globalAlpha = 1;
  context.font = '600 11px Onest, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  for (const group of groups) {
    if (group.indices.length < 2) continue;
    const first = group.indices[0];
    if (first === undefined) continue;
    const base = first * LINEUP_STRIDE;
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

function drawDraftOrigin(
  context: CanvasRenderingContext2D,
  origin: { readonly x: number; readonly y: number } | null | undefined,
  overview: MapOverview,
  scale: number,
  color: string,
): void {
  if (origin === null || origin === undefined) return;
  context.globalAlpha = 1;
  drawOriginMarker(
    context,
    radarX(overview, origin.x) * scale,
    radarY(overview, origin.y) * scale,
    scale,
    color,
    color,
    true,
  );
}

/**
 * Draws grenade lineups across the radar map:
 * - An origin marker where the player stands (color-coded by side).
 * - A curved trajectory flight arc from origin to landing.
 * - A landing marker with the grenade's effect radius ring.
 *
 * Lineups are drawn deterministically with zero allocations during paint.
 */
export function lineupLayer(options: LineupLayerOptions): Layer {
  const { lineups, plot, groups, overview, colors, view, focused, draftOrigin } = options;
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
    const ox = (plot[base] ?? 0) * scale;
    const oy = (plot[base + 1] ?? 0) * scale;
    const lx = (plot[base + 2] ?? 0) * scale;
    const ly = (plot[base + 3] ?? 0) * scale;

    const utilityColor = grenadeColorOfKind(lineup.kind, colors);
    const originFill = sideColor(lineup.side, colors);

    context.globalAlpha = alpha;

    drawFlightArc(context, ox, oy, lx, ly, scale, lineWidth, utilityColor, isFocused);
    drawOriginMarker(context, ox, oy, scale, originFill, colors.selectionRing, isFocused);
    drawLandingMarker(context, lx, ly, scale, lineup.kind, overview.scale, utilityColor, isFocused);
  };

  return (context, size) => {
    readPlateGeometry(view.current, size, RADAR_IMAGE_SIZE, geometry);
    context.translate(geometry.offsetX, geometry.offsetY);

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
      geometry.scale,
      colors.selectionRing,
      colors.selectionEdge,
    );
    drawDraftOrigin(context, draftOrigin, overview, geometry.scale, colors.selectionRing);
  };
}
