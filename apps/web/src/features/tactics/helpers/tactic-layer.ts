import type {
  Lineup,
  TacticDrawingStroke,
  TacticSide,
  TacticThrow,
  UtilityKind,
} from '@disa/demo-core';
import type { MapOverview } from '@disa/map-data';
import type { CanvasSize, Layer } from '@/core/renderer';
import {
  drawGrenadeMark,
  drawNeedle,
  drawSelectionRing,
  drawToken,
  type PlateGeometry,
  type PlateView,
  plateGeometry,
  type RadarColors,
  readPlateGeometry,
  SQUARE_PLATE,
} from '@/features/radar';
import type { EditorPlayer } from './editor-tactic';
import type { InterpolatedGrenadeFlight, InterpolatedUtilityActive } from './tactic-interpolation';
import {
  drawArrowhead,
  drawTrajectoryArc,
  drawUtilityHaloArea,
  projectWorldToScreen,
  renderSingleDrawingStroke,
} from './tactic-layer-drawing';
import { drawLineupMarkers } from './tactic-lineup-markers';
import { drawSpawnMarkers, type SpawnSpots } from './tactic-spawn-markers';

export interface TacticLayerOptions {
  readonly overview: MapOverview;
  readonly colors: RadarColors;
  readonly view: { readonly current: PlateView };
  readonly side?: TacticSide | undefined;
  readonly players: readonly EditorPlayer[];
  readonly throws: readonly TacticThrow[];
  readonly flyingGrenades?: readonly InterpolatedGrenadeFlight[] | undefined;
  readonly activeUtilities?: readonly InterpolatedUtilityActive[] | undefined;
  readonly drawings?: readonly TacticDrawingStroke[] | undefined;
  readonly selectedSlot?: number | null | undefined;
  readonly selectedThrowId?: string | null | undefined;
  readonly hoveredSlot?: number | null | undefined;
  readonly hoveredThrowId?: string | null | undefined;
  readonly lineups?: readonly Lineup[] | undefined;
  readonly hoveredLineupId?: string | null | undefined;
  readonly spawnSpots?: SpawnSpots | undefined;
  readonly liveStroke?: { readonly current: TacticDrawingStroke | null } | undefined;
  readonly liveThrow?: { readonly current: TacticThrow | null } | undefined;
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
  players: readonly EditorPlayer[],
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

    const labelText =
      player.label !== undefined && player.label !== '' ? player.label : String(player.slot + 1);
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
    readPlateGeometry(options.view.current, size, SQUARE_PLATE, geometry);

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
      lineups = [],
      hoveredLineupId,
    } = options;

    renderTacticDrawings(context, drawings, overview, geometry);
    if (options.spawnSpots !== undefined) {
      drawSpawnMarkers(context, options.spawnSpots, side, overview, geometry, colors);
    }
    drawLineupMarkers(context, lineups, hoveredLineupId, overview, geometry, colors);
    if (options.liveStroke?.current !== null && options.liveStroke?.current !== undefined) {
      renderSingleDrawingStroke(context, options.liveStroke.current, overview, geometry);
    }
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
    if (options.liveThrow?.current !== null && options.liveThrow?.current !== undefined) {
      renderSingleThrow(
        context,
        options.liveThrow.current,
        overview,
        geometry,
        colors,
        true,
        false,
      );
    }
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
