import type { PlayerSlot, Team } from '@disa/demo-core';
import { type MapOverview, RADAR_IMAGE_SIZE, type RadarPoint } from '@disa/map-data';
import { type PointerEvent, type RefObject, useEffect, useRef } from 'react';
import { drawCoachMovedPlayer, drawCoachStroke, drawCoachUtility } from '../helpers/coach-draw';
import type { CoachAnnotations, CoachTool } from '../helpers/coach-types';
import type { RadarColors } from '../helpers/colors';
import {
  type PlateGeometry,
  type PlateView,
  plateGeometry,
  readPlateGeometry,
} from '../helpers/view';

interface Props {
  readonly canvasRef: RefObject<HTMLCanvasElement | null>;
  readonly isExpanded: boolean;
  readonly annotations: CoachAnnotations;
  readonly originalPlayerPoints: ReadonlyMap<PlayerSlot, RadarPoint>;
  readonly teamBySlot: readonly (Team | undefined)[];
  readonly overview: MapOverview;
  readonly colors: RadarColors;
  readonly view: RefObject<PlateView>;
  readonly hoveredUtilityId: string | null;
  readonly hoveredPlayerSlot: PlayerSlot | null;
  readonly tool: CoachTool;
  readonly repaintTrigger?: number;
  readonly onPointerDown: (event: PointerEvent<HTMLCanvasElement>) => void;
  readonly onPointerMove: (event: PointerEvent<HTMLCanvasElement>) => void;
  readonly onPointerUp: (event: PointerEvent<HTMLCanvasElement>) => void;
  readonly onPointerCancel: (event: PointerEvent<HTMLCanvasElement>) => void;
}

function cursorClassForTool(tool: CoachTool): string {
  switch (tool) {
    case 'pencil':
    case 'eraser':
      return 'cursor-crosshair';
    case 'move':
      return 'cursor-grab';
    case 'smoke':
    case 'molotov':
    case 'flash':
    case 'he':
      return 'cursor-cell';
  }
}

function paintCoachOverlay(
  canvas: HTMLCanvasElement,
  geometry: PlateGeometry,
  annotations: CoachAnnotations,
  originalPlayerPoints: ReadonlyMap<PlayerSlot, RadarPoint>,
  teamBySlot: readonly (Team | undefined)[],
  overview: MapOverview,
  colors: RadarColors,
  view: PlateView,
  hoveredUtilityId: string | null,
  hoveredPlayerSlot: PlayerSlot | null,
): void {
  const box = canvas.getBoundingClientRect();
  const width = box.width;
  const height = box.height;
  if (width === 0 || height === 0) return;

  const context = canvas.getContext('2d');
  if (context === null) return;

  const ratio = window.devicePixelRatio;
  const backingWidth = Math.round(width * ratio);
  const backingHeight = Math.round(height * ratio);

  if (canvas.width !== backingWidth) canvas.width = backingWidth;
  if (canvas.height !== backingHeight) canvas.height = backingHeight;

  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);

  readPlateGeometry(view, { width, height }, RADAR_IMAGE_SIZE, geometry);

  for (const stroke of annotations.strokes) {
    drawCoachStroke(context, stroke, geometry);
  }

  for (const u of annotations.utilities) {
    drawCoachUtility(context, u, geometry, overview, colors, u.id === hoveredUtilityId);
  }

  for (const m of annotations.movedPlayers) {
    const orig = originalPlayerPoints.get(m.slot);
    if (orig === undefined) continue;

    const team = teamBySlot[m.slot];
    drawCoachMovedPlayer(
      context,
      m,
      orig,
      team,
      m.slot + 1,
      geometry,
      colors,
      m.slot === hoveredPlayerSlot,
    );
  }
}

export function CoachCanvas({
  canvasRef,
  isExpanded,
  annotations,
  originalPlayerPoints,
  teamBySlot,
  overview,
  colors,
  view,
  hoveredUtilityId,
  hoveredPlayerSlot,
  tool,
  repaintTrigger,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: Props) {
  const geometryRef = useRef<PlateGeometry>(plateGeometry());

  // Paint the coach overlay whenever annotations, zoom/pan, or hover state moves
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;
    void repaintTrigger;

    paintCoachOverlay(
      canvas,
      geometryRef.current,
      annotations,
      originalPlayerPoints,
      teamBySlot,
      overview,
      colors,
      view.current,
      hoveredUtilityId,
      hoveredPlayerSlot,
    );
  }, [
    canvasRef,
    annotations,
    originalPlayerPoints,
    teamBySlot,
    overview,
    colors,
    view,
    hoveredUtilityId,
    hoveredPlayerSlot,
    repaintTrigger,
  ]);

  const cursorClass = cursorClassForTool(tool);

  return (
    <canvas
      ref={canvasRef}
      className={`touch-none ${cursorClass} ${
        isExpanded ? 'absolute inset-0 size-full' : 'aspect-square w-[min(100cqi,100cqb)]'
      }`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    />
  );
}
