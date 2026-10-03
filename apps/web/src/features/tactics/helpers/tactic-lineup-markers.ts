import type { Lineup } from '@disa/demo-core';
import type { MapOverview } from '@disa/map-data';
import type { PlateGeometry, RadarColors } from '@/features/radar';
import { drawTrajectoryArc, projectWorldToScreen } from './tactic-layer-drawing';

const MARKER_RADIUS = 5;
const HOVER_MARKER_RADIUS = 8;

function colorOfKind(lineup: Lineup, colors: RadarColors): string {
  switch (lineup.kind) {
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
    case 'kit':
      return colors.selectionRing;
  }
}

/**
 * The lineups a thrower can pick, as dots at where they land; the hovered one also shows where it is
 * thrown from, so choosing is a matter of pointing at the landing the tactic needs.
 */
export function drawLineupMarkers(
  context: CanvasRenderingContext2D,
  lineups: readonly Lineup[],
  hoveredId: string | null | undefined,
  overview: MapOverview,
  geometry: PlateGeometry,
  colors: RadarColors,
): void {
  for (const lineup of lineups) {
    const landing = projectWorldToScreen(overview, lineup.landing.x, lineup.landing.y, geometry);
    const ink = colorOfKind(lineup, colors);
    const isHovered = lineup.id === hoveredId;

    if (isHovered) {
      const origin = projectWorldToScreen(overview, lineup.origin.x, lineup.origin.y, geometry);
      drawTrajectoryArc(context, origin.x, origin.y, landing.x, landing.y, ink, 2, true, 0.9);
      context.save();
      context.fillStyle = ink;
      context.beginPath();
      context.arc(origin.x, origin.y, 4, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }

    context.save();
    context.globalAlpha = isHovered ? 1 : 0.7;
    context.fillStyle = ink;
    context.strokeStyle = colors.selectionRing;
    context.lineWidth = isHovered ? 2 : 1;
    context.beginPath();
    context.arc(
      landing.x,
      landing.y,
      isHovered ? HOVER_MARKER_RADIUS : MARKER_RADIUS,
      0,
      Math.PI * 2,
    );
    context.fill();
    context.stroke();
    context.restore();
  }
}
