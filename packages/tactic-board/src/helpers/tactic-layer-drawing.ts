import type { TacticDrawingStroke, UtilityKind } from '@disa/demo-core';
import { type MapOverview, radarX, radarY } from '@disa/map-data';
import type { PlateGeometry, RadarColors } from '@disa/plate';

const SMOKE_RADIUS_UNITS = 144;
const MOLOTOV_RADIUS_UNITS = 160;

export function projectWorldToScreen(
  overview: MapOverview,
  wx: number,
  wy: number,
  geometry: PlateGeometry,
): { readonly x: number; readonly y: number } {
  const rx = radarX(overview, wx);
  const ry = radarY(overview, wy);
  return {
    x: rx * geometry.scale + geometry.offsetX,
    y: ry * geometry.scale + geometry.offsetY,
  };
}

export function drawTrajectoryArc(
  context: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  color: string,
  lineWidth: number,
  isDashed: boolean,
  alpha: number,
): { readonly cx: number; readonly cy: number } {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const dist = Math.hypot(dx, dy);

  let cx = (fromX + toX) / 2;
  let cy = (fromY + toY) / 2;

  if (dist > 1) {
    const nx = -dy / dist;
    const ny = dx / dist;
    const curveOffset = Math.min(dist * 0.15, 30);
    cx += nx * curveOffset;
    cy += ny * curveOffset;
  }

  context.save();
  context.globalAlpha = alpha;
  context.strokeStyle = color;
  context.lineWidth = lineWidth;
  if (isDashed) {
    context.setLineDash([5, 3]);
  }
  context.beginPath();
  context.moveTo(fromX, fromY);
  context.quadraticCurveTo(cx, cy, toX, toY);
  context.stroke();
  context.restore();

  return { cx, cy };
}

export function drawArrowhead(
  context: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  radius: number,
  color: string,
  alpha: number,
): void {
  const angle = Math.atan2(toY - fromY, toX - fromX);
  const headLen = Math.max(7, radius * 0.85);

  const edgeX = toX - Math.cos(angle) * (radius + 2);
  const edgeY = toY - Math.sin(angle) * (radius + 2);

  context.save();
  context.globalAlpha = alpha;
  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = 1.5;
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
  context.restore();
}

export function drawUtilityHaloArea(
  context: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  kind: UtilityKind,
  overview: MapOverview,
  geometry: PlateGeometry,
  colors: RadarColors,
  alphaMultiplier = 1.0,
): void {
  context.save();

  if (kind === 'smoke') {
    const radius = (SMOKE_RADIUS_UNITS / overview.scale) * geometry.scale;
    context.globalAlpha = 0.22 * alphaMultiplier;
    context.fillStyle = colors.nadeSmoke;
    context.beginPath();
    context.arc(cx, cy, radius, 0, Math.PI * 2);
    context.fill();

    context.globalAlpha = 0.8 * alphaMultiplier;
    context.lineWidth = 1.5;
    context.strokeStyle = colors.nadeSmoke;
    context.stroke();
  } else if (kind === 'fire') {
    const radius = (MOLOTOV_RADIUS_UNITS / overview.scale) * geometry.scale;
    context.globalAlpha = 0.22 * alphaMultiplier;
    context.fillStyle = colors.nadeMolotov;
    context.beginPath();
    context.arc(cx, cy, radius, 0, Math.PI * 2);
    context.fill();

    context.globalAlpha = 0.8 * alphaMultiplier;
    context.lineWidth = 1.5;
    context.strokeStyle = colors.nadeMolotov;
    context.stroke();
  } else if (kind === 'flash') {
    const radius = geometry.tokenRadius * 1.5;
    context.globalAlpha = 0.25 * alphaMultiplier;
    context.fillStyle = colors.blind;
    context.beginPath();
    context.arc(cx, cy, radius, 0, Math.PI * 2);
    context.fill();

    context.globalAlpha = 0.85 * alphaMultiplier;
    context.lineWidth = 1.5;
    context.strokeStyle = colors.blind;
    context.stroke();
  } else if (kind === 'he') {
    const radius = geometry.tokenRadius * 1.8;
    context.globalAlpha = 0.18 * alphaMultiplier;
    context.fillStyle = colors.nadeHe;
    context.beginPath();
    context.arc(cx, cy, radius, 0, Math.PI * 2);
    context.fill();

    context.globalAlpha = 0.85 * alphaMultiplier;
    context.lineWidth = 1.5;
    context.setLineDash([4, 3]);
    context.strokeStyle = colors.nadeHe;
    context.stroke();
  } else if (kind === 'decoy') {
    const radius = geometry.tokenRadius * 1.2;
    context.globalAlpha = 0.2 * alphaMultiplier;
    context.fillStyle = colors.nadeDecoy;
    context.beginPath();
    context.arc(cx, cy, radius, 0, Math.PI * 2);
    context.fill();

    context.globalAlpha = 0.7 * alphaMultiplier;
    context.lineWidth = 1;
    context.setLineDash([2, 2]);
    context.strokeStyle = colors.nadeDecoy;
    context.stroke();
  }

  context.restore();
}

export function renderSingleDrawingStroke(
  context: CanvasRenderingContext2D,
  stroke: TacticDrawingStroke,
  overview: MapOverview,
  geometry: PlateGeometry,
): void {
  const { points } = stroke;
  const firstPoint = points[0];
  if (firstPoint === undefined) return;

  context.save();
  context.strokeStyle = stroke.color;
  context.fillStyle = stroke.color;
  context.lineWidth = Math.max(2.5, Math.min(5, 3 * (geometry.tokenRadius / 8)));
  context.lineCap = 'round';
  context.lineJoin = 'round';

  const p0 = projectWorldToScreen(overview, firstPoint.x, firstPoint.y, geometry);

  if (points.length === 1) {
    context.beginPath();
    context.arc(p0.x, p0.y, context.lineWidth / 2, 0, Math.PI * 2);
    context.fill();
  } else {
    context.beginPath();
    context.moveTo(p0.x, p0.y);

    for (let j = 1; j < points.length; j++) {
      const pt = points[j];
      if (pt === undefined) continue;
      const p = projectWorldToScreen(overview, pt.x, pt.y, geometry);
      context.lineTo(p.x, p.y);
    }

    context.stroke();
  }
  context.restore();
}
