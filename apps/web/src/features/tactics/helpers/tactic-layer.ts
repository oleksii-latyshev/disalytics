import type { Lineup, TacticDrawingStroke, TacticSide, TacticStep } from '@disa/demo-core';
import { type MapOverview, type RadarPoint, radarX, radarY } from '@disa/map-data';
import type { CanvasSize, Layer } from '@/core/renderer';
import {
  drawGrenadeMark,
  drawSelectionRing,
  drawToken,
  type PlateGeometry,
  type PlateView,
  plateGeometry,
  type RadarColors,
  readPlateGeometry,
  SQUARE_PLATE,
} from '@/features/radar';
import type { TacticClock } from './tactic-clock';
import { grenadeColorOfKind } from './tactic-grenade-colors';
import { drawUtilityHaloArea, renderSingleDrawingStroke } from './tactic-layer-drawing';
import { drawLineupMarkers } from './tactic-lineup-markers';
import { glideProgress, popScale, type TacticMotion } from './tactic-motion';
import { drawEndGhost, drawHandle, strokeLeg, strokePoints } from './tactic-route-drawing';
import { sampleScene, type TacticScene } from './tactic-scene';
import { type ScheduledThrow, type TacticSchedule, UTILITY_LIFE_SECONDS } from './tactic-schedule';
import { drawSpawnMarkers, type SpawnSpots } from './tactic-spawn-markers';

export interface TacticPreview {
  readonly points: readonly RadarPoint[];
  readonly reachable: boolean;
}

export interface TacticLayerOptions {
  readonly overview: MapOverview;
  readonly colors: RadarColors;
  readonly view: { readonly current: PlateView };
  readonly side: TacticSide;
  readonly schedule: TacticSchedule;
  readonly step: TacticStep | undefined;
  readonly stepIndex: number;
  readonly selectedSlot: number | null;
  readonly clock: TacticClock;
  readonly scene: TacticScene;
  readonly motion: TacticMotion;
  readonly lineups?: readonly Lineup[] | undefined;
  readonly hoveredLineupId?: string | null | undefined;
  readonly spawnSpots?: SpawnSpots | undefined;
  readonly hoveredHandle?: number | null | undefined;
  readonly preview: { readonly current: TacticPreview | null };
  readonly liveStroke: { readonly current: readonly RadarPoint[] | null };
}

const NO_DASH: number[] = [];

function marchOffset(motion: TacticMotion, nowMs: number): number {
  return motion.isReduced ? 0 : -((nowMs / 40) % 30);
}

function arcControl(thrown: ScheduledThrow): RadarPoint {
  const dx = thrown.toX - thrown.fromX;
  const dy = thrown.toY - thrown.fromY;
  const length = Math.hypot(dx, dy) || 1;
  return {
    x: (thrown.fromX + thrown.toX) / 2 - (dy / length) * 0.16 * length,
    y: (thrown.fromY + thrown.toY) / 2 + (dx / length) * 0.16 * length,
  };
}

function drawArc(
  context: CanvasRenderingContext2D,
  thrown: ScheduledThrow,
  g: PlateGeometry,
  options: TacticLayerOptions,
  alpha: number,
  nowMs: number,
): void {
  const control = arcControl(thrown);
  const trace = () => {
    context.beginPath();
    context.moveTo(thrown.fromX * g.scale + g.offsetX, thrown.fromY * g.scale + g.offsetY);
    context.quadraticCurveTo(
      control.x * g.scale + g.offsetX,
      control.y * g.scale + g.offsetY,
      thrown.toX * g.scale + g.offsetX,
      thrown.toY * g.scale + g.offsetY,
    );
  };
  context.save();
  context.globalAlpha = alpha;
  context.lineCap = 'round';
  context.strokeStyle = options.colors.hollow;
  context.lineWidth = 5;
  trace();
  context.stroke();
  context.strokeStyle = grenadeColorOfKind(thrown.kind, options.colors);
  context.lineWidth = 2.5;
  context.setLineDash([2, 7]);
  context.lineDashOffset = marchOffset(options.motion, nowMs);
  trace();
  context.stroke();
  context.restore();
}

function drawThrowIcon(
  context: CanvasRenderingContext2D,
  thrown: ScheduledThrow,
  g: PlateGeometry,
  options: TacticLayerOptions,
  nowMs: number,
): void {
  const x = thrown.toX * g.scale + g.offsetX;
  const y = thrown.toY * g.scale + g.offsetY;
  const scale = popScale(options.motion, `throw:${thrown.id}`, nowMs);
  context.save();
  context.translate(x, y);
  context.scale(scale, scale);
  context.fillStyle = options.colors.hollow;
  context.strokeStyle = options.colors.team[options.side];
  context.lineWidth = 2;
  context.beginPath();
  context.arc(0, 0, g.tokenRadius * 0.75, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  drawGrenadeMark(context, 0, 0, thrown.kind, grenadeColorOfKind(thrown.kind, options.colors));
  context.restore();
}

function drawEarlierAreas(
  context: CanvasRenderingContext2D,
  g: PlateGeometry,
  options: TacticLayerOptions,
): void {
  const startsAt = options.schedule.steps[options.stepIndex]?.startSeconds ?? 0;
  for (const thrown of options.schedule.throws) {
    if (thrown.stepIndex >= options.stepIndex || thrown.landAt > startsAt) continue;
    if (startsAt - thrown.landAt >= UTILITY_LIFE_SECONDS[thrown.kind]) continue;
    drawUtilityHaloArea(
      context,
      thrown.toX * g.scale + g.offsetX,
      thrown.toY * g.scale + g.offsetY,
      thrown.kind,
      options.overview,
      g,
      options.colors,
      0.6,
    );
  }
}

function drawGhostRoutes(
  context: CanvasRenderingContext2D,
  g: PlateGeometry,
  options: TacticLayerOptions,
): void {
  const { schedule, stepIndex, colors, side } = options;
  for (const leg of schedule.steps[stepIndex - 1]?.legs ?? []) {
    if (leg.isDead || leg.lengthPx < 1) continue;
    strokeLeg(context, leg, g, {
      color: colors.team[side],
      under: colors.hollow,
      width: 2,
      alpha: 0.3,
      dash: [3, 7],
    });
  }
}

function drawEditRoutes(
  context: CanvasRenderingContext2D,
  g: PlateGeometry,
  options: TacticLayerOptions,
  nowMs: number,
): void {
  const { schedule, stepIndex, selectedSlot, colors, side } = options;
  const color = colors.team[side];
  const current = schedule.steps[stepIndex];
  if (current === undefined) return;
  drawGhostRoutes(context, g, options);

  const ordered = [...current.legs].sort(
    (a, b) => Number(a.slot === selectedSlot) - Number(b.slot === selectedSlot),
  );
  for (const leg of ordered) {
    if (leg.isDead || leg.lengthPx < 1) continue;
    const isSelected = leg.slot === selectedSlot;
    const isDimmed = selectedSlot !== null && !isSelected;
    strokeLeg(context, leg, g, {
      color,
      under: colors.hollow,
      width: isSelected ? 4 : 2.5,
      alpha: isDimmed ? 0.45 : 1,
      dashOffset: marchOffset(options.motion, nowMs),
    });
    const endX = (leg.xs[leg.xs.length - 1] ?? 0) * g.scale + g.offsetX;
    const endY = (leg.ys[leg.ys.length - 1] ?? 0) * g.scale + g.offsetY;
    const ring = { ring: color, ground: colors.hollow };
    drawEndGhost(
      context,
      endX,
      endY,
      g.tokenRadius,
      String(leg.slot + 1),
      ring,
      isDimmed ? 0.5 : 1,
    );
  }
}

function drawHandles(
  context: CanvasRenderingContext2D,
  g: PlateGeometry,
  options: TacticLayerOptions,
  nowMs: number,
): void {
  const { step, selectedSlot, overview, colors, side } = options;
  const player = step?.players.find((entry) => entry.slot === selectedSlot);
  if (player === undefined || player.route.mode !== 'points') return;
  const ring = { ring: colors.team[side], ground: colors.hollow };

  player.route.points.forEach((point, index) => {
    const x = radarX(overview, point.x) * g.scale + g.offsetX;
    const y = radarY(overview, point.y) * g.scale + g.offsetY;
    const pop = popScale(options.motion, `handle:${selectedSlot}:${index}`, nowMs);
    drawHandle(context, x, y, pop, ring, options.hoveredHandle === index);
  });
}

function drawPreview(
  context: CanvasRenderingContext2D,
  g: PlateGeometry,
  options: TacticLayerOptions,
  nowMs: number,
): void {
  const color = options.colors.team[options.side];
  const stroke = {
    color,
    under: options.colors.hollow,
    width: 3,
    alpha: 1,
    dash: [9, 7],
    dashOffset: marchOffset(options.motion, nowMs),
  };
  const preview = options.preview.current;
  if (preview !== null) {
    strokePoints(
      context,
      preview.points,
      g,
      preview.reachable ? stroke : { ...stroke, dash: [3, 7] },
    );
    const end = preview.points[preview.points.length - 1];
    if (end !== undefined) {
      context.save();
      context.strokeStyle = color;
      context.lineWidth = 3;
      context.beginPath();
      context.arc(end.x * g.scale + g.offsetX, end.y * g.scale + g.offsetY, 9, 0, Math.PI * 2);
      context.stroke();
      context.restore();
    }
  }
  const live = options.liveStroke.current;
  if (live !== null) strokePoints(context, live, g, { ...stroke, width: 4, dash: NO_DASH });
}

function lerp(from: number | undefined, to: number, progress: number): number {
  const start = from ?? to;
  return start + (to - start) * progress;
}

function drawTokenMark(
  context: CanvasRenderingContext2D,
  g: PlateGeometry,
  options: TacticLayerOptions,
  mark: { readonly x: number; readonly y: number; readonly slot: number; readonly isDead: boolean },
): void {
  const { colors, side } = options;
  drawToken(context, mark.x, mark.y, g.tokenRadius, mark.isDead ? colors.dead : colors.team[side]);
  context.fillStyle = colors.hollow;
  context.font = `bold ${Math.round(g.tokenRadius * 1.05)}px IBM Plex Mono, monospace`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(mark.isDead ? '✕' : String(mark.slot + 1), mark.x, mark.y + 0.5);
}

function drawTokens(
  context: CanvasRenderingContext2D,
  g: PlateGeometry,
  options: TacticLayerOptions,
  nowMs: number,
): void {
  const { schedule, scene, clock, motion, colors, selectedSlot } = options;
  const step = schedule.steps[options.stepIndex];
  const progress = clock.isShown ? 1 : glideProgress(motion, nowMs);

  for (let slot = 0; slot < schedule.slotCount; slot++) {
    const leg = step?.legs[slot];
    const isDead = clock.isShown ? scene.isDead[slot] === 1 : (leg?.isDead ?? false);
    const x = clock.isShown ? scene.playerX[slot] : leg?.xs[0];
    const y = clock.isShown ? scene.playerY[slot] : leg?.ys[0];
    const rx = lerp(motion.fromX[slot], x ?? 0, progress);
    const ry = lerp(motion.fromY[slot], y ?? 0, progress);
    motion.lastX[slot] = rx;
    motion.lastY[slot] = ry;

    const screenX = rx * g.scale + g.offsetX;
    const screenY = ry * g.scale + g.offsetY;
    drawTokenMark(context, g, options, { x: screenX, y: screenY, slot, isDead });
    if (!clock.isShown && slot === selectedSlot) {
      drawSelectionRing(
        context,
        screenX,
        screenY,
        g.tokenRadius,
        colors.selectionRing,
        colors.selectionEdge,
      );
    }
  }
}

function drawEditScene(
  context: CanvasRenderingContext2D,
  g: PlateGeometry,
  options: TacticLayerOptions,
  nowMs: number,
): void {
  const { schedule, stepIndex, selectedSlot } = options;
  drawEarlierAreas(context, g, options);
  drawEditRoutes(context, g, options, nowMs);

  for (const thrown of schedule.steps[stepIndex]?.throws ?? []) {
    const isDimmed = selectedSlot !== null && thrown.slot !== selectedSlot;
    drawUtilityHaloArea(
      context,
      thrown.toX * g.scale + g.offsetX,
      thrown.toY * g.scale + g.offsetY,
      thrown.kind,
      options.overview,
      g,
      options.colors,
      isDimmed ? 0.6 : 1,
    );
    drawArc(context, thrown, g, options, isDimmed ? 0.5 : 1, nowMs);
    drawThrowIcon(context, thrown, g, options, nowMs);
  }
  drawHandles(context, g, options, nowMs);
  drawPreview(context, g, options, nowMs);
}

function drawSceneAreas(
  context: CanvasRenderingContext2D,
  g: PlateGeometry,
  options: TacticLayerOptions,
): void {
  const { scene, colors } = options;
  for (let i = 0; i < scene.areaCount; i++) {
    const kind = scene.areaKind[i] ?? 'smoke';
    const life = UTILITY_LIFE_SECONDS[kind];
    const left = life - (scene.areaAge[i] ?? 0);
    const fade = kind === 'smoke' ? Math.min(1, left / 2) : Math.max(0, left / life);
    drawUtilityHaloArea(
      context,
      (scene.areaX[i] ?? 0) * g.scale + g.offsetX,
      (scene.areaY[i] ?? 0) * g.scale + g.offsetY,
      kind,
      options.overview,
      g,
      colors,
      Math.max(0, fade),
    );
  }
}

function drawSceneFlights(
  context: CanvasRenderingContext2D,
  g: PlateGeometry,
  options: TacticLayerOptions,
): void {
  const { scene, colors } = options;
  for (let i = 0; i < scene.flightCount; i++) {
    context.fillStyle = grenadeColorOfKind(scene.flightKind[i] ?? 'smoke', colors);
    context.strokeStyle = colors.hollow;
    context.lineWidth = 2.5;
    context.beginPath();
    context.arc(
      (scene.flightX[i] ?? 0) * g.scale + g.offsetX,
      (scene.flightY[i] ?? 0) * g.scale + g.offsetY,
      6,
      0,
      Math.PI * 2,
    );
    context.fill();
    context.stroke();
  }
}

function drawPlayback(
  context: CanvasRenderingContext2D,
  g: PlateGeometry,
  options: TacticLayerOptions,
): void {
  const { schedule, scene, colors, side, clock } = options;
  sampleScene(schedule, clock.time, scene);
  const color = colors.team[side];
  const step = schedule.steps[scene.stepIndex];
  const local = clock.time - (step?.startSeconds ?? 0);
  const routeStroke = { color, under: colors.hollow, width: 2, alpha: 0.45, dash: [3, 7] };
  const doneStroke = { color, under: colors.hollow, width: 3.5, alpha: 1 };

  drawSceneAreas(context, g, options);
  for (const leg of step?.legs ?? []) {
    if (leg.isDead || leg.lengthPx < 1) continue;
    strokeLeg(context, leg, g, routeStroke);
    const travelled = Math.max(0, (local - leg.delaySeconds) * schedule.speedPxPerSecond);
    let upTo = 0;
    while (upTo < leg.xs.length - 1 && (leg.cum[upTo + 1] ?? 0) <= travelled) upTo++;
    strokeLeg(context, leg, g, doneStroke, {
      upTo,
      endX: scene.playerX[leg.slot] ?? 0,
      endY: scene.playerY[leg.slot] ?? 0,
    });
  }
  drawSceneFlights(context, g, options);
}

/** The tactic board's layer: routes, grenades, marks and tokens, for the step edited or the plan playing. */
export function tacticLayer(options: TacticLayerOptions): Layer {
  const geometry: PlateGeometry = plateGeometry();

  return (context: CanvasRenderingContext2D, size: CanvasSize) => {
    readPlateGeometry(options.view.current, size, SQUARE_PLATE, geometry);
    const nowMs = performance.now();
    const isPlayback = options.clock.isShown;

    if (!isPlayback) {
      for (const stroke of (options.step?.drawings ?? []) as readonly TacticDrawingStroke[]) {
        if (stroke.points.length > 0) {
          renderSingleDrawingStroke(context, stroke, options.overview, geometry);
        }
      }
      if (options.spawnSpots !== undefined) {
        drawSpawnMarkers(
          context,
          options.spawnSpots,
          options.side,
          options.overview,
          geometry,
          options.colors,
        );
      }
      drawLineupMarkers(
        context,
        options.lineups ?? [],
        options.hoveredLineupId,
        options.overview,
        geometry,
        options.colors,
      );
      drawEditScene(context, geometry, options, nowMs);
    } else {
      drawPlayback(context, geometry, options);
    }
    drawTokens(context, geometry, options, nowMs);
    options.motion.isPriming = false;
  };
}
