import {
  type GrenadeType,
  grenadeRadiusUnits,
  type LineupSide,
  type UtilityKind,
} from '@disa/demo-core';
import type { RadarColors } from '@/features/radar';
import { LINEUP_STRIDE, type LineupGroup } from './lineup-plot';

const FULL_TURN = 2 * Math.PI;

const ORIGIN_RADIUS_PX = 3;
const LANDING_RADIUS_PX = 2.5;
const LANDING_RING_WIDTH_PX = 1;
const SELECTED_NODE_DASH = [3, 2];

export function sideColor(side: LineupSide, colors: RadarColors): string {
  switch (side) {
    case 'CT':
      return colors.team.CT;
    case 'T':
      return colors.team.T;
    default:
      return colors.selectionRing;
  }
}

export function grenadeColorOfKind(kind: UtilityKind, colors: RadarColors): string {
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

export function drawOriginMarker(
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

export function drawLandingMarker(
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

export function drawGroupBadges(
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

export function drawBounceMarker(
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

export function drawDraggableHandle(
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

export function drawSelectedNodeRing(
  context: CanvasRenderingContext2D,
  nx: number,
  ny: number,
  color: string,
  target: 'origin' | 'landing' | 'waypoint',
): void {
  context.save();
  context.globalAlpha = 1;
  context.lineWidth = 2;
  context.strokeStyle = color;
  context.beginPath();
  if (target === 'origin') {
    context.moveTo(nx, ny - 9);
    context.lineTo(nx + 9, ny);
    context.lineTo(nx, ny + 9);
    context.lineTo(nx - 9, ny);
    context.closePath();
  } else if (target === 'waypoint') {
    context.rect(nx - 8, ny - 8, 16, 16);
  } else {
    context.arc(nx, ny, 8.5, 0, FULL_TURN);
  }
  context.stroke();

  context.lineWidth = 1.5;
  context.strokeStyle = '#ffffff';
  context.setLineDash(SELECTED_NODE_DASH);
  context.beginPath();
  context.arc(nx, ny, 13, 0, FULL_TURN);
  context.stroke();
  context.restore();
}
