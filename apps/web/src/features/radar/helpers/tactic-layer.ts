import type {
  TacticDrawingStroke,
  TacticPlayerPosition,
  TacticSide,
  TacticThrow,
  UtilityKind,
} from '@disa/demo-core';
import { type MapOverview, RADAR_IMAGE_SIZE, radarX, radarY } from '@disa/map-data';
import type { CanvasSize, Layer } from '@/core/renderer';
import type { RadarColors } from './colors';
import { drawGrenadeMark } from './equipment-marks';
import type { InterpolatedGrenadeFlight, InterpolatedUtilityActive } from './tactic-interpolation';
import { drawNeedle, drawSelectionRing, drawToken } from './tokens';
import { type PlateGeometry, type PlateView, plateGeometry, readPlateGeometry } from './view';

const SMOKE_RADIUS_UNITS = 144;
const MOLOTOV_RADIUS_UNITS = 160;

export interface TacticLayerOptions {
  readonly overview: MapOverview;
  readonly colors: RadarColors;
  readonly view: { readonly current: PlateView };
  readonly side?: TacticSide | undefined;
  readonly players: readonly TacticPlayerPosition[];
  readonly throws: readonly TacticThrow[];
  readonly flyingGrenades?: readonly InterpolatedGrenadeFlight[] | undefined;
  readonly activeUtilities?: readonly InterpolatedUtilityActive[] | undefined;
  readonly drawings?: readonly TacticDrawingStroke[] | undefined;
  readonly selectedSlot?: number | null | undefined;
  readonly selectedThrowId?: string | null | undefined;
  readonly hoveredSlot?: number | null | undefined;
  readonly hoveredThrowId?: string | null | undefined;
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

function projectWorldToScreen(
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

function drawTrajectoryArc(
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

function drawArrowhead(
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

function drawUtilityHaloArea(
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

function renderSingleDrawingStroke(
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

function renderTacticDrawings(
  context: CanvasRenderingContext2D,
  drawings: readonly TacticDrawingStroke[],
  overview: MapOverview,
  geometry: PlateGeometry,
): void {
  for (let i = 0; i < drawings.length; i++) {
    const stroke = drawings[i];
    if (stroke !== undefined && stroke.points.length > 0) {
      renderSingleDrawingStroke(context, stroke, overview, geometry);
    }
  }
}

function renderActiveUtilities(
  context: CanvasRenderingContext2D,
  activeUtilities: readonly InterpolatedUtilityActive[],
  overview: MapOverview,
  geometry: PlateGeometry,
  colors: RadarColors,
): void {
  for (let i = 0; i < activeUtilities.length; i++) {
    const active = activeUtilities[i];
    if (active === undefined) continue;

    const p = projectWorldToScreen(overview, active.position.x, active.position.y, geometry);
    const remainingFraction = Math.max(
      0,
      Math.min(1, 1 - active.elapsedSinceLanding / active.totalDuration),
    );
    const alphaMult = remainingFraction < 0.2 ? remainingFraction / 0.2 : 1.0;

    drawUtilityHaloArea(context, p.x, p.y, active.kind, overview, geometry, colors, alphaMult);
    drawGrenadeMark(context, p.x, p.y, active.kind, grenadeColorOfKind(active.kind, colors));
  }
}

function renderSingleThrow(
  context: CanvasRenderingContext2D,
  t: TacticThrow,
  overview: MapOverview,
  geometry: PlateGeometry,
  colors: RadarColors,
  isSelected: boolean,
  isHovered: boolean,
): void {
  const from = projectWorldToScreen(overview, t.from.x, t.from.y, geometry);
  const to = projectWorldToScreen(overview, t.to.x, t.to.y, geometry);
  const nadeColor = grenadeColorOfKind(t.kind, colors);
  const alpha = isSelected ? 1.0 : isHovered ? 0.9 : 0.65;
  const lineWidth = isSelected ? 2.5 : isHovered ? 2.0 : 1.5;

  const { cx, cy } = drawTrajectoryArc(
    context,
    from.x,
    from.y,
    to.x,
    to.y,
    nadeColor,
    lineWidth,
    true,
    alpha,
  );

  drawArrowhead(context, cx, cy, to.x, to.y, geometry.tokenRadius, nadeColor, alpha);

  context.save();
  context.globalAlpha = alpha;
  context.fillStyle = nadeColor;
  context.beginPath();
  context.arc(from.x, from.y, 3.5, 0, Math.PI * 2);
  context.fill();
  context.restore();

  drawUtilityHaloArea(context, to.x, to.y, t.kind, overview, geometry, colors, alpha);
  drawGrenadeMark(context, to.x, to.y, t.kind, nadeColor);

  if (isSelected) {
    context.save();
    context.lineWidth = 2;
    context.strokeStyle = colors.selectionRing;
    context.beginPath();
    context.arc(to.x, to.y, 14, 0, Math.PI * 2);
    context.stroke();
    context.restore();
  }
}

function renderTacticThrows(
  context: CanvasRenderingContext2D,
  throws: readonly TacticThrow[],
  overview: MapOverview,
  geometry: PlateGeometry,
  colors: RadarColors,
  selectedThrowId: string | null | undefined,
  hoveredThrowId: string | null | undefined,
): void {
  for (let i = 0; i < throws.length; i++) {
    const t = throws[i];
    if (t === undefined) continue;

    const isSelected = t.id === selectedThrowId;
    const isHovered = t.id === hoveredThrowId;
    renderSingleThrow(context, t, overview, geometry, colors, isSelected, isHovered);
  }
}

function renderFlyingGrenades(
  context: CanvasRenderingContext2D,
  flyingGrenades: readonly InterpolatedGrenadeFlight[],
  overview: MapOverview,
  geometry: PlateGeometry,
  colors: RadarColors,
): void {
  for (let i = 0; i < flyingGrenades.length; i++) {
    const flight = flyingGrenades[i];
    if (flight === undefined) continue;

    const p = projectWorldToScreen(overview, flight.currentPos.x, flight.currentPos.y, geometry);
    const nadeColor = grenadeColorOfKind(flight.kind, colors);

    context.save();
    context.fillStyle = nadeColor;
    context.beginPath();
    context.arc(p.x, p.y, 4.5, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = '#ffffff';
    context.beginPath();
    context.arc(p.x, p.y, 2, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }
}

function renderTacticPlayers(
  context: CanvasRenderingContext2D,
  players: readonly TacticPlayerPosition[],
  side: TacticSide,
  overview: MapOverview,
  geometry: PlateGeometry,
  colors: RadarColors,
  selectedSlot: number | null | undefined,
  hoveredSlot: number | null | undefined,
): void {
  const teamColor = side === 'CT' ? colors.team.CT : colors.team.T;

  for (let i = 0; i < players.length; i++) {
    const player = players[i];
    if (player === undefined) continue;

    const p = projectWorldToScreen(overview, player.x, player.y, geometry);
    const radius = geometry.tokenRadius;
    const isSelected = player.slot === selectedSlot;
    const isHovered = player.slot === hoveredSlot;

    if (player.yaw !== undefined) {
      const screenAngle = (-player.yaw * Math.PI) / 180;
      drawNeedle(context, p.x, p.y, radius, screenAngle, false, colors.label.ink);
    }

    drawToken(context, p.x, p.y, radius, teamColor);

    const labelText = player.label ?? String(player.slot + 1);
    context.save();
    context.fillStyle = colors.hollow;
    context.font = `bold ${Math.round(radius * 1.05)}px IBM Plex Mono, monospace`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(labelText, p.x, p.y + 0.5);
    context.restore();

    if (isSelected) {
      drawSelectionRing(context, p.x, p.y, radius, colors.selectionRing, colors.selectionEdge);
    } else if (isHovered) {
      context.save();
      context.lineWidth = 1.5;
      context.strokeStyle = colors.selectionRing;
      context.globalAlpha = 0.6;
      context.beginPath();
      context.arc(p.x, p.y, radius + 2.5, 0, Math.PI * 2);
      context.stroke();
      context.restore();
    }
  }
}

/**
 * Creates the canvas Layer for drawing tactics board entities:
 * pencil annotations, grenade trajectories and halos, and player tokens.
 */
export function tacticLayer(options: TacticLayerOptions): Layer {
  const geometry: PlateGeometry = plateGeometry();

  return (context: CanvasRenderingContext2D, size: CanvasSize) => {
    readPlateGeometry(options.view.current, size, RADAR_IMAGE_SIZE, geometry);

    const {
      overview,
      colors,
      side = 'CT',
      players,
      throws,
      flyingGrenades = [],
      activeUtilities = [],
      drawings = [],
      selectedSlot,
      selectedThrowId,
      hoveredSlot,
      hoveredThrowId,
    } = options;

    renderTacticDrawings(context, drawings, overview, geometry);
    renderActiveUtilities(context, activeUtilities, overview, geometry, colors);
    renderTacticThrows(
      context,
      throws,
      overview,
      geometry,
      colors,
      selectedThrowId,
      hoveredThrowId,
    );
    renderFlyingGrenades(context, flyingGrenades, overview, geometry, colors);
    renderTacticPlayers(
      context,
      players,
      side,
      overview,
      geometry,
      colors,
      selectedSlot,
      hoveredSlot,
    );
  };
}
