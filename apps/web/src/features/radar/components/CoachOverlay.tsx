import type { ParsedDemo, PlayerSlot, Team } from '@disa/demo-core';
import type { MapOverview, PlateLayout, RadarPoint } from '@disa/map-data';
import {
  type MutableRefObject,
  type PointerEvent,
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { drawCoachMovedPlayer, drawCoachStroke, drawCoachUtility } from '../helpers/coach-draw';
import { type CoachHover, hoverAt } from '../helpers/coach-edit';
import { playerPointsAtFrame } from '../helpers/coach-originals';
import type { CoachSession } from '../helpers/coach-session';
import { type CoachAnnotations, type CoachTool, resolvePencilColor } from '../helpers/coach-types';
import type { RadarColors } from '../helpers/colors';
import type { PlateBox } from '../helpers/plate-box';
import {
  type PlateGeometry,
  type PlateView,
  plateGeometry,
  radarPointAt,
  readPlateGeometry,
} from '../helpers/view';
import { useCoachState } from '../hooks/use-coach-session';

interface Props {
  readonly session: CoachSession;
  readonly demo: ParsedDemo;
  readonly overview: MapOverview;
  readonly layout: PlateLayout;
  readonly box: PlateBox;
  readonly isExpanded: boolean;
  readonly canvasRef: RefObject<HTMLCanvasElement | null>;
  readonly paintRef: MutableRefObject<(() => void) | null>;
  readonly view: RefObject<PlateView>;
  readonly frame: number;
  readonly teamBySlot: readonly (Team | undefined)[];
  readonly colors: RadarColors;
}

const NO_HOVER: CoachHover = { utilityId: null, playerSlot: null };

function cursorFor(tool: CoachTool): string {
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

function sizeBackingStore(canvas: HTMLCanvasElement, width: number, height: number): void {
  const ratio = window.devicePixelRatio;
  const backingWidth = Math.round(width * ratio);
  const backingHeight = Math.round(height * ratio);
  if (canvas.width !== backingWidth) canvas.width = backingWidth;
  if (canvas.height !== backingHeight) canvas.height = backingHeight;
}

interface PaintScene {
  readonly overview: MapOverview;
  readonly colors: RadarColors;
  readonly hover: CoachHover;
  readonly originals: ReadonlyMap<PlayerSlot, RadarPoint>;
  readonly teamBySlot: readonly (Team | undefined)[];
}

function paintCoach(
  context: CanvasRenderingContext2D,
  geometry: PlateGeometry,
  annotations: CoachAnnotations,
  { overview, colors, hover, originals, teamBySlot }: PaintScene,
): void {
  for (const stroke of annotations.strokes) drawCoachStroke(context, stroke, geometry);

  for (const utility of annotations.utilities) {
    drawCoachUtility(context, utility, geometry, overview, colors, utility.id === hover.utilityId);
  }

  for (const moved of annotations.movedPlayers) {
    const origin = originals.get(moved.slot);
    if (origin === undefined) continue;

    drawCoachMovedPlayer(
      context,
      moved,
      origin,
      teamBySlot[moved.slot],
      moved.slot + 1,
      geometry,
      colors,
      moved.slot === hover.playerSlot,
    );
  }
}

function sameHover(a: CoachHover, b: CoachHover): boolean {
  return a.utilityId === b.utilityId && a.playerSlot === b.playerSlot;
}

export function CoachOverlay({
  session,
  demo,
  overview,
  layout,
  box,
  isExpanded,
  canvasRef,
  paintRef,
  view,
  frame,
  teamBySlot,
  colors,
}: Props) {
  const { tool, color, history } = useCoachState(session);
  const annotations = history.present;
  const geometryRef = useRef<PlateGeometry>(plateGeometry());
  const [pointed, setPointed] = useState(NO_HOVER);
  const hover = tool === 'move' ? pointed : NO_HOVER;

  const originals = useMemo(
    () => playerPointsAtFrame(demo, overview, frame, teamBySlot),
    [demo, overview, frame, teamBySlot],
  );
  const strokeColor = resolvePencilColor(color, colors);

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (canvas === null || context === null || context === undefined) return;

    const { width, height } = canvas.getBoundingClientRect();
    if (width === 0 || height === 0) return;

    sizeBackingStore(canvas, width, height);
    context.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
    context.clearRect(0, 0, width, height);

    const geometry = geometryRef.current;
    readPlateGeometry(view.current, { width, height }, layout, geometry);
    paintCoach(context, geometry, annotations, { overview, colors, hover, originals, teamBySlot });
  }, [canvasRef, view, layout, annotations, overview, colors, hover, originals, teamBySlot]);

  useEffect(() => {
    paintRef.current = paint;
    paint();

    const observer = new ResizeObserver(paint);
    if (canvasRef.current !== null) observer.observe(canvasRef.current);

    return () => {
      observer.disconnect();
      paintRef.current = null;
    };
  }, [paint, paintRef, canvasRef]);

  const pointAt = (event: PointerEvent<HTMLCanvasElement>): RadarPoint => {
    const rect = event.currentTarget.getBoundingClientRect();

    return radarPointAt(
      view.current,
      event.clientX - rect.left,
      event.clientY - rect.top,
      rect,
      layout,
    );
  };

  const target = { originals, strokeColor };

  const handlePointerDown = (event: PointerEvent<HTMLCanvasElement>): void => {
    event.currentTarget.setPointerCapture(event.pointerId);
    session.pointerDown(pointAt(event), target);
  };

  const handlePointerMove = (event: PointerEvent<HTMLCanvasElement>): void => {
    const point = pointAt(event);
    session.pointerMove(point, target);

    if (tool !== 'move') return;

    const next = hoverAt(annotations, originals, point);
    setPointed((current) => (sameHover(current, next) ? current : next));
  };

  const style = isExpanded ? undefined : { width: box.width, height: box.height };
  const placement = isExpanded ? 'inset-0 size-full' : 'inset-0 m-auto';
  const pointers = tool === null ? 'pointer-events-none' : cursorFor(tool);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute touch-none ${placement} ${pointers}`}
      style={style}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={session.pointerUp}
      onPointerCancel={session.pointerUp}
    />
  );
}
