import type { PlayerSlot, Team } from '@disa/demo-core';
import type { MapOverview, RadarPoint } from '@disa/map-data';
import type { CoachMovedPlayer, CoachStroke, CoachUtility } from './coach-types';
import type { RadarColors } from './colors';
import { drawGrenadeMark } from './equipment-marks';
import { drawSelectionRing, drawToken } from './tokens';
import type { PlateGeometry } from './view';

const SMOKE_RADIUS_UNITS = 144;
const MOLOTOV_RADIUS_UNITS = 160;

export function projectPoint(point: RadarPoint, geometry: PlateGeometry): RadarPoint {
  return {
    x: point.x * geometry.scale + geometry.offsetX,
    y: point.y * geometry.scale + geometry.offsetY,
  };
}

export function drawCoachStroke(
  context: CanvasRenderingContext2D,
  stroke: CoachStroke,
  geometry: PlateGeometry,
): void {
  const { points, color } = stroke;
  if (points.length === 0) return;

  context.save();
  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = Math.max(2.5, Math.min(5, 3 * (geometry.tokenRadius / 8)));
  context.lineCap = 'round';
  context.lineJoin = 'round';
  const firstPoint = points[0];
  if (firstPoint === undefined) {
    context.restore();
    return;
  }

  if (points.length === 1) {
    const p = projectPoint(firstPoint, geometry);
    context.beginPath();
    context.arc(p.x, p.y, context.lineWidth / 2, 0, Math.PI * 2);
    context.fill();
    context.restore();
    return;
  }

  context.beginPath();
  const first = projectPoint(firstPoint, geometry);
  context.moveTo(first.x, first.y);

  for (let i = 1; i < points.length; i++) {
    const pt = points[i];
    if (pt === undefined) continue;
    const p = projectPoint(pt, geometry);
    context.lineTo(p.x, p.y);
  }

  context.stroke();
  context.restore();
}

function drawUtilityHalo(
  context: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  ringColor: string,
): void {
  context.save();
  context.lineWidth = 2;
  context.strokeStyle = ringColor;
  context.beginPath();
  context.arc(cx, cy, radius + 3, 0, Math.PI * 2);
  context.stroke();
  context.restore();
}

function drawSmokeUtility(
  context: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  geometry: PlateGeometry,
  overview: MapOverview,
  colors: RadarColors,
  isHovered: boolean,
): void {
  const radius = (SMOKE_RADIUS_UNITS / overview.scale) * geometry.scale;

  context.save();
  context.globalAlpha = 0.22;
  context.fillStyle = colors.nadeSmoke;
  context.beginPath();
  context.arc(cx, cy, radius, 0, Math.PI * 2);
  context.fill();

  context.globalAlpha = 0.8;
  context.lineWidth = 1.5;
  context.strokeStyle = colors.nadeSmoke;
  context.stroke();
  context.restore();

  drawGrenadeMark(context, cx, cy, 'smoke', colors.nadeSmoke);

  if (isHovered) {
    drawUtilityHalo(context, cx, cy, 12, colors.selectionRing);
  }
}

function drawMolotovUtility(
  context: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  geometry: PlateGeometry,
  overview: MapOverview,
  colors: RadarColors,
  isHovered: boolean,
): void {
  const radius = (MOLOTOV_RADIUS_UNITS / overview.scale) * geometry.scale;

  context.save();
  context.globalAlpha = 0.22;
  context.fillStyle = colors.nadeMolotov;
  context.beginPath();
  context.arc(cx, cy, radius, 0, Math.PI * 2);
  context.fill();

  context.globalAlpha = 0.8;
  context.lineWidth = 1.5;
  context.strokeStyle = colors.nadeMolotov;
  context.stroke();
  context.restore();

  drawGrenadeMark(context, cx, cy, 'fire', colors.nadeMolotov);

  if (isHovered) {
    drawUtilityHalo(context, cx, cy, 12, colors.selectionRing);
  }
}

function drawFlashUtility(
  context: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  geometry: PlateGeometry,
  colors: RadarColors,
  isHovered: boolean,
): void {
  const radius = geometry.tokenRadius * 1.5;

  context.save();
  context.globalAlpha = 0.25;
  context.fillStyle = colors.blind;
  context.beginPath();
  context.arc(cx, cy, radius, 0, Math.PI * 2);
  context.fill();

  context.globalAlpha = 0.85;
  context.lineWidth = 1.5;
  context.strokeStyle = colors.blind;
  context.stroke();
  context.restore();

  drawGrenadeMark(context, cx, cy, 'flash', colors.blind);

  if (isHovered) {
    drawUtilityHalo(context, cx, cy, 12, colors.selectionRing);
  }
}

function drawHeUtility(
  context: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  geometry: PlateGeometry,
  colors: RadarColors,
  isHovered: boolean,
): void {
  const radius = geometry.tokenRadius * 1.8;

  context.save();
  context.globalAlpha = 0.18;
  context.fillStyle = colors.nadeHe;
  context.beginPath();
  context.arc(cx, cy, radius, 0, Math.PI * 2);
  context.fill();

  context.globalAlpha = 0.85;
  context.lineWidth = 1.5;
  context.setLineDash([4, 3]);
  context.strokeStyle = colors.nadeHe;
  context.stroke();
  context.restore();

  drawGrenadeMark(context, cx, cy, 'he', colors.nadeHe);

  if (isHovered) {
    drawUtilityHalo(context, cx, cy, 12, colors.selectionRing);
  }
}

export function drawCoachUtility(
  context: CanvasRenderingContext2D,
  utility: CoachUtility,
  geometry: PlateGeometry,
  overview: MapOverview,
  colors: RadarColors,
  isHovered: boolean,
): void {
  const p = projectPoint(utility.point, geometry);

  switch (utility.kind) {
    case 'smoke':
      drawSmokeUtility(context, p.x, p.y, geometry, overview, colors, isHovered);
      break;
    case 'molotov':
      drawMolotovUtility(context, p.x, p.y, geometry, overview, colors, isHovered);
      break;
    case 'flash':
      drawFlashUtility(context, p.x, p.y, geometry, colors, isHovered);
      break;
    case 'he':
      drawHeUtility(context, p.x, p.y, geometry, colors, isHovered);
      break;
  }
}

function drawArrowhead(
  context: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  radius: number,
): void {
  const angle = Math.atan2(toY - fromY, toX - fromX);
  const headLen = Math.max(8, radius * 0.9);

  // Stop arrowhead slightly before the token edge
  const edgeX = toX - Math.cos(angle) * (radius + 2);
  const edgeY = toY - Math.sin(angle) * (radius + 2);

  context.beginPath();
  context.moveTo(edgeX, edgeY);
  context.lineTo(
    edgeX - headLen * Math.cos(angle - Math.PI / 6),
    edgeY - headLen * Math.sin(angle - Math.PI / 6),
  );
  context.moveTo(edgeX, edgeY);
  context.lineTo(
    edgeX - headLen * Math.cos(angle + Math.PI / 6),
    edgeY - headLen * Math.sin(angle + Math.PI / 6),
  );
  context.stroke();
}

export function drawCoachMovedPlayer(
  context: CanvasRenderingContext2D,
  moved: CoachMovedPlayer,
  origPoint: RadarPoint,
  team: Team | undefined,
  slotNumber: number,
  geometry: PlateGeometry,
  colors: RadarColors,
  isHovered: boolean,
): void {
  const p0 = projectPoint(origPoint, geometry);
  const p1 = projectPoint(moved.point, geometry);
  const teamColor = team ? colors.team[team] : colors.dead;
  const radius = geometry.tokenRadius;

  context.save();

  // Ghost ring at original spot
  context.lineWidth = 1.5;
  context.setLineDash([3, 3]);
  context.strokeStyle = teamColor;
  context.globalAlpha = 0.6;
  context.beginPath();
  context.arc(p0.x, p0.y, radius, 0, Math.PI * 2);
  context.stroke();

  // Dashed vector connecting original to new spot
  const dist = Math.hypot(p1.x - p0.x, p1.y - p0.y);
  if (dist > radius * 1.5) {
    context.lineWidth = 2;
    context.setLineDash([4, 4]);
    context.strokeStyle = teamColor;
    context.globalAlpha = 0.85;
    context.beginPath();
    context.moveTo(p0.x, p0.y);
    context.lineTo(p1.x, p1.y);
    context.stroke();

    context.setLineDash([]);
    drawArrowhead(context, p0.x, p0.y, p1.x, p1.y, radius);
  }

  context.restore();

  // Moved token at new spot
  drawToken(context, p1.x, p1.y, radius, teamColor);

  // Number label in center of token
  context.save();
  context.fillStyle = colors.hollow;
  context.font = `bold ${Math.round(radius * 1.1)}px system-ui, sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(String(slotNumber), p1.x, p1.y + 0.5);
  context.restore();

  if (isHovered) {
    drawSelectionRing(context, p1.x, p1.y, radius, colors.selectionRing, colors.selectionEdge);
  }
}

export function pointDistance(a: RadarPoint, b: RadarPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function pointToSegmentDistance(p: RadarPoint, a: RadarPoint, b: RadarPoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) return pointDistance(p, a);

  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const projX = a.x + t * dx;
  const projY = a.y + t * dy;

  return Math.hypot(p.x - projX, p.y - projY);
}

export function findHitUtility(
  utilities: readonly CoachUtility[],
  radarPoint: RadarPoint,
  thresholdRadarUnits = 20,
): CoachUtility | null {
  for (let i = utilities.length - 1; i >= 0; i--) {
    const u = utilities[i];
    if (u !== undefined && pointDistance(u.point, radarPoint) <= thresholdRadarUnits) {
      return u;
    }
  }

  return null;
}

export function findHitMovedPlayer(
  movedPlayers: readonly CoachMovedPlayer[],
  radarPoint: RadarPoint,
  thresholdRadarUnits = 20,
): CoachMovedPlayer | null {
  for (let i = movedPlayers.length - 1; i >= 0; i--) {
    const m = movedPlayers[i];
    if (m !== undefined && pointDistance(m.point, radarPoint) <= thresholdRadarUnits) {
      return m;
    }
  }

  return null;
}

export function findHitPlayerToken(
  originalPointsBySlot: ReadonlyMap<PlayerSlot, RadarPoint>,
  movedPlayers: readonly CoachMovedPlayer[],
  radarPoint: RadarPoint,
  thresholdRadarUnits = 20,
): { slot: PlayerSlot; point: RadarPoint; isMoved: boolean } | null {
  // First check moved players
  for (let i = movedPlayers.length - 1; i >= 0; i--) {
    const m = movedPlayers[i];
    if (m !== undefined && pointDistance(m.point, radarPoint) <= thresholdRadarUnits) {
      return { slot: m.slot, point: m.point, isMoved: true };
    }
  }

  // Then check original player positions
  for (const [slot, orig] of originalPointsBySlot) {
    if (pointDistance(orig, radarPoint) <= thresholdRadarUnits) {
      return { slot, point: orig, isMoved: false };
    }
  }

  return null;
}

export function findHitStroke(
  strokes: readonly CoachStroke[],
  radarPoint: RadarPoint,
  thresholdRadarUnits = 12,
): CoachStroke | null {
  for (let i = strokes.length - 1; i >= 0; i--) {
    const stroke = strokes[i];
    if (stroke === undefined) continue;

    const { points } = stroke;
    const first = points[0];

    if (
      points.length === 1 &&
      first !== undefined &&
      pointDistance(first, radarPoint) <= thresholdRadarUnits
    ) {
      return stroke;
    }

    for (let j = 0; j < points.length - 1; j++) {
      const p1 = points[j];
      const p2 = points[j + 1];
      if (
        p1 !== undefined &&
        p2 !== undefined &&
        pointToSegmentDistance(radarPoint, p1, p2) <= thresholdRadarUnits
      ) {
        return stroke;
      }
    }
  }

  return null;
}
