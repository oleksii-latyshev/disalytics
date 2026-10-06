import type { TacticPoint, TacticSide } from '@disa/demo-core';
import { type MapOverview, radarX, radarY } from '@disa/map-data';
import type { PlateGeometry, RadarColors } from '@/features/radar';

/** The spots to mark, with what the draw needs already worked out so it allocates nothing. */
export interface SpawnSpots {
  readonly points: readonly TacticPoint[];
  readonly occupied: readonly boolean[];
  readonly labels: readonly string[];
}

const HALF_SIDE = 6;
const OCCUPIED_DOT = 2;

/**
 * Where a side can start, as quiet outlined squares: a free spot is an empty square, a taken one
 * keeps a dot inside and fades, so the squares read as places and never as players.
 */
export function drawSpawnMarkers(
  context: CanvasRenderingContext2D,
  spots: SpawnSpots,
  side: TacticSide,
  overview: MapOverview,
  geometry: PlateGeometry,
  colors: RadarColors,
): void {
  context.save();
  context.strokeStyle = side === 'CT' ? colors.team.CT : colors.team.T;
  context.fillStyle = colors.label.ink;
  context.lineWidth = 1.5;
  context.font = '9px IBM Plex Mono, monospace';
  context.textAlign = 'center';
  context.textBaseline = 'top';

  for (let i = 0; i < spots.points.length; i++) {
    const point = spots.points[i];
    if (point === undefined) continue;
    const x = radarX(overview, point.x) * geometry.scale + geometry.offsetX;
    const y = radarY(overview, point.y) * geometry.scale + geometry.offsetY;
    const isTaken = spots.occupied[i] === true;

    context.globalAlpha = isTaken ? 0.4 : 0.85;
    context.strokeRect(x - HALF_SIDE, y - HALF_SIDE, HALF_SIDE * 2, HALF_SIDE * 2);
    if (isTaken) {
      context.beginPath();
      context.arc(x, y, OCCUPIED_DOT, 0, Math.PI * 2);
      context.stroke();
    }
    context.globalAlpha = isTaken ? 0.35 : 0.8;
    context.fillText(spots.labels[i] ?? '', x, y + HALF_SIDE + 2);
  }

  context.restore();
}
