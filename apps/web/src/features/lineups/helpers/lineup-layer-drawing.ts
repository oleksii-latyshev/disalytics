import { type MapOverview, radarX, radarY } from '@disa/map-data';
import type { RadarColors } from '@/features/radar';
import {
  drawBounceMarker,
  drawDraggableHandle,
  drawLandingMarker,
  drawOriginMarker,
} from './lineup-layer-markers';

export function drawFlightArc(
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

export function drawDraftPlacement(
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

  let lastX = ox;
  let lastY = oy;
  if (draftWaypoints) {
    for (let i = 0; i < draftWaypoints.length; i++) {
      const wp = draftWaypoints[i];
      if (!wp) continue;
      const wx = radarX(overview, wp.x) * scale;
      const wy = radarY(overview, wp.y) * scale;
      drawFlightArc(context, lastX, lastY, wx, wy, scale, 2 * scale, colors.selectionRing, false);
      drawBounceMarker(context, wx, wy, scale, colors.selectionRing, true, i);
      drawDraggableHandle(context, wx, wy, scale, colors.selectionRing);
      lastX = wx;
      lastY = wy;
    }
  }

  if (hoverPoint) {
    const hx = radarX(overview, hoverPoint.x) * scale;
    const hy = radarY(overview, hoverPoint.y) * scale;
    drawFlightArc(context, lastX, lastY, hx, hy, scale, 1.5 * scale, colors.selectionRing, true);
    drawLandingMarker(context, hx, hy, scale, 'smoke', overview.scale, colors.selectionRing, true);
  }
}
