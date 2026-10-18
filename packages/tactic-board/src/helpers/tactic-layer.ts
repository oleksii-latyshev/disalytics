import type { Lineup, TacticDrawingStroke, TacticSide, TacticStep } from '@disa/demo-core';
import {
  type FloorPoint,
  type MapOverview,
  mapFloors,
  type RadarPoint,
  radarX,
  radarY,
} from '@disa/map-data';
import type { CanvasSize, Layer } from '@disa/plate';
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
} from '@disa/plate';
import type { TacticClock } from './tactic-clock';
import type { SlotColors } from './tactic-colors';
import { type EnemyMarks, oppositeSide } from './tactic-enemies';
import {
  createEnemyTextCache,
  drawEnemies,
  drawEnemyMark,
  type EnemyDrawing,
  type EnemyRoleLabels,
} from './tactic-enemy-drawing';
import { grenadeColorOfKind } from './tactic-grenade-colors';
import { drawUtilityHaloArea, renderSingleDrawingStroke } from './tactic-layer-drawing';
import { drawLineupMarkers } from './tactic-lineup-markers';
import { glideProgress, popScale, type TacticMotion } from './tactic-motion';
import { floorOfPoint } from './tactic-route';
import {
  drawEndGhost,
  drawHandle,
  drawLegLinks,
  floorAlpha,
  type RouteStroke,
  strokeLeg,
  strokePoints,
} from './tactic-route-drawing';
import { sampleScene, type TacticScene } from './tactic-scene';
import {
  type PlayerLeg,
  type ScheduledThrow,
  type TacticSchedule,
  UTILITY_LIFE_SECONDS,
} from './tactic-schedule';
import { drawSpawnMarkers, type SpawnSpots } from './tactic-spawn-markers';

export interface TacticPreview {
  readonly points: readonly FloorPoint[];
  readonly reachable: boolean;
}

export interface TacticLayerOptions {
  readonly overview: MapOverview;
  readonly colors: RadarColors;
  readonly slotColors: SlotColors;
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
  /** A plate nobody edits draws no waypoint handles. */
  readonly isReadOnly?: boolean | undefined;
  /** The expected enemies of every step, by step index. */
  readonly enemyMarks: readonly EnemyMarks[];
  readonly selectedEnemyId: string | null;
  readonly enemyRoleLabels: EnemyRoleLabels;
  readonly preview: { readonly current: TacticPreview | null };
  readonly liveStroke: { readonly current: readonly RadarPoint[] | null };
  /** The floor in view, as a position in `mapFloors`; what is on another one is drawn faded. Floor 0 when absent. */
  readonly floor?: number | undefined;
  /** The other team's tactic, played on the same clock; omitted when none is shown. */
  readonly opponents?: TacticOpponents | undefined;
}

/** The opponents of a match round: their schedule and the buffers it is sampled into. */
export interface TacticOpponents {
  readonly schedule: TacticSchedule;
  readonly scene: TacticScene;
}

const NO_DASH: number[] = [];
const ARC_DASH = [2, 7];
const OPPONENT_DASH = [3, 7];
const OPPONENT_ALPHA = 0.35;
const NO_LEGS: readonly PlayerLeg[] = [];

function activeFloor(options: TacticLayerOptions): number {
  return options.floor ?? 0;
}

const FLOOR_REFS = new WeakMap<MapOverview, readonly number[]>();

/** The altitude of each floor, made once per map: `drawLegLinks` reads it every frame. */
function floorRefsOf(overview: MapOverview): readonly number[] {
  let refs = FLOOR_REFS.get(overview);
  if (refs === undefined) {
    refs = mapFloors(overview).map((floor) => floor.refZ);
    FLOOR_REFS.set(overview, refs);
  }
  return refs;
}

function slotInk(options: TacticLayerOptions, slot: number): string {
  return options.slotColors[slot] ?? options.colors.team[options.side];
}

function marchOffset(motion: TacticMotion, nowMs: number): number {
  return motion.isReduced ? 0 : -((nowMs / 40) % 30);
}

function traceArc(
  context: CanvasRenderingContext2D,
  thrown: ScheduledThrow,
  g: PlateGeometry,
  controlX: number,
  controlY: number,
): void {
  context.beginPath();
  context.moveTo(thrown.fromX * g.scale + g.offsetX, thrown.fromY * g.scale + g.offsetY);
  context.quadraticCurveTo(
    controlX * g.scale + g.offsetX,
    controlY * g.scale + g.offsetY,
    thrown.toX * g.scale + g.offsetX,
    thrown.toY * g.scale + g.offsetY,
  );
}

function drawArc(
  context: CanvasRenderingContext2D,
  thrown: ScheduledThrow,
  g: PlateGeometry,
  options: TacticLayerOptions,
  ink: string,
  alpha: number,
  nowMs: number,
): void {
  const dx = thrown.toX - thrown.fromX;
  const dy = thrown.toY - thrown.fromY;
  const length = Math.hypot(dx, dy) || 1;
  const controlX = (thrown.fromX + thrown.toX) / 2 - (dy / length) * 0.16 * length;
  const controlY = (thrown.fromY + thrown.toY) / 2 + (dx / length) * 0.16 * length;
  context.save();
  context.globalAlpha = alpha;
  context.lineCap = 'round';
  context.strokeStyle = options.colors.hollow;
  context.lineWidth = 5;
  traceArc(context, thrown, g, controlX, controlY);
  context.stroke();
  context.strokeStyle = ink;
  context.lineWidth = 2.5;
  context.setLineDash(ARC_DASH);
  context.lineDashOffset = marchOffset(options.motion, nowMs);
  traceArc(context, thrown, g, controlX, controlY);
  context.stroke();
  context.restore();
}

function drawThrowIcon(
  context: CanvasRenderingContext2D,
  thrown: ScheduledThrow,
  g: PlateGeometry,
  options: TacticLayerOptions,
  ink: string,
  scale: number,
): void {
  const x = thrown.toX * g.scale + g.offsetX;
  const y = thrown.toY * g.scale + g.offsetY;
  context.save();
  context.globalAlpha = floorAlpha(thrown.floor, activeFloor(options));
  context.translate(x, y);
  context.scale(scale, scale);
  context.fillStyle = options.colors.hollow;
  context.strokeStyle = ink;
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
  schedule: TacticSchedule,
): void {
  const startsAt = schedule.steps[options.stepIndex]?.startSeconds ?? 0;
  for (const thrown of schedule.throws) {
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
      0.6 * floorAlpha(thrown.floor, activeFloor(options)),
    );
  }
}

function drawGhostRoutes(
  context: CanvasRenderingContext2D,
  g: PlateGeometry,
  options: TacticLayerOptions,
): void {
  const { schedule, stepIndex, colors } = options;
  const active = activeFloor(options);
  for (const leg of schedule.steps[stepIndex - 1]?.legs ?? []) {
    if (leg.isDead || leg.lengthPx < 1) continue;
    strokeLeg(context, leg, g, {
      color: slotInk(options, leg.slot),
      under: colors.hollow,
      width: 2,
      alpha: 0.3,
      dash: [3, 7],
      activeFloor: active,
    });
  }
}

function drawEditLeg(
  context: CanvasRenderingContext2D,
  g: PlateGeometry,
  options: TacticLayerOptions,
  leg: PlayerLeg,
  nowMs: number,
): void {
  const { selectedSlot, colors } = options;
  const active = activeFloor(options);
  const isSelected = leg.slot === selectedSlot;
  const isDimmed = selectedSlot !== null && !isSelected;
  const color = slotInk(options, leg.slot);
  strokeLeg(context, leg, g, {
    color,
    under: colors.hollow,
    width: isSelected ? 4 : 2.5,
    alpha: isDimmed ? 0.45 : 1,
    dashOffset: marchOffset(options.motion, nowMs),
    activeFloor: active,
  });
  drawLegLinks(context, leg, g, floorRefsOf(options.overview), {
    color,
    ground: colors.hollow,
    active,
    alpha: isDimmed ? 0.5 : 1,
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
    (isDimmed ? 0.5 : 1) * floorAlpha(leg.floors[leg.floors.length - 1] ?? 0, active),
  );
}

function drawEditRoutes(
  context: CanvasRenderingContext2D,
  g: PlateGeometry,
  options: TacticLayerOptions,
  nowMs: number,
): void {
  const { schedule, stepIndex, selectedSlot } = options;
  const current = schedule.steps[stepIndex];
  if (current === undefined) return;
  drawGhostRoutes(context, g, options);

  const ordered = [...current.legs].sort(
    (a, b) => Number(a.slot === selectedSlot) - Number(b.slot === selectedSlot),
  );
  for (const leg of ordered) {
    if (leg.isDead || leg.lengthPx < 1) continue;
    drawEditLeg(context, g, options, leg, nowMs);
  }
}

function drawHandles(
  context: CanvasRenderingContext2D,
  g: PlateGeometry,
  options: TacticLayerOptions,
  nowMs: number,
): void {
  const { step, selectedSlot, overview, colors } = options;
  if (options.isReadOnly === true) return;
  const player = step?.players.find((entry) => entry.slot === selectedSlot);
  if (player === undefined || player.route.mode !== 'points') return;
  const ring = { ring: slotInk(options, player.slot), ground: colors.hollow };

  player.route.points.forEach((point, index) => {
    const x = radarX(overview, point.x) * g.scale + g.offsetX;
    const y = radarY(overview, point.y) * g.scale + g.offsetY;
    const pop = popScale(options.motion, `handle:${selectedSlot}:${index}`, nowMs);
    context.save();
    context.globalAlpha = floorAlpha(floorOfPoint(overview, point), activeFloor(options));
    drawHandle(context, x, y, pop, ring, options.hoveredHandle === index);
    context.restore();
  });
}

function drawPreview(
  context: CanvasRenderingContext2D,
  g: PlateGeometry,
  options: TacticLayerOptions,
  nowMs: number,
): void {
  const color = slotInk(options, options.selectedSlot ?? 0);
  const stroke = {
    color,
    under: options.colors.hollow,
    width: 3,
    alpha: 1,
    dash: [9, 7],
    dashOffset: marchOffset(options.motion, nowMs),
    activeFloor: activeFloor(options),
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
    if (end !== undefined && end.floor === activeFloor(options)) {
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
  const { colors } = options;
  drawToken(
    context,
    mark.x,
    mark.y,
    g.tokenRadius,
    mark.isDead ? colors.dead : slotInk(options, mark.slot),
  );
  context.fillStyle = colors.hollow;
  context.font = `bold ${Math.round(g.tokenRadius * 1.05)}px IBM Plex Mono, monospace`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(mark.isDead ? '✕' : String(mark.slot + 1), mark.x, mark.y + 0.5);
}

/** The floor a token stands on: where the playing plan has it, or where the step begins. */
function tokenFloor(options: TacticLayerOptions, slot: number, leg: PlayerLeg | undefined): number {
  return options.clock.isShown ? (options.scene.playerFloor[slot] ?? 0) : (leg?.floors[0] ?? 0);
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
    context.save();
    context.globalAlpha = floorAlpha(tokenFloor(options, slot, leg), activeFloor(options));
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
    context.restore();
  }
}

function drawEditScene(
  context: CanvasRenderingContext2D,
  g: PlateGeometry,
  options: TacticLayerOptions,
  nowMs: number,
): void {
  const { schedule, stepIndex, selectedSlot } = options;
  drawEarlierAreas(context, g, options, schedule);
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
      (isDimmed ? 0.6 : 1) * floorAlpha(thrown.floor, activeFloor(options)),
    );
    drawArc(
      context,
      thrown,
      g,
      options,
      slotInk(options, thrown.slot),
      (isDimmed ? 0.5 : 1) * floorAlpha(thrown.floor, activeFloor(options)),
      nowMs,
    );
    drawThrowIcon(
      context,
      thrown,
      g,
      options,
      slotInk(options, thrown.slot),
      popScale(options.motion, `throw:${thrown.id}`, nowMs),
    );
  }
  drawHandles(context, g, options, nowMs);
  drawPreview(context, g, options, nowMs);
}

function drawSceneAreas(
  context: CanvasRenderingContext2D,
  g: PlateGeometry,
  options: TacticLayerOptions,
  scene: TacticScene,
): void {
  const { colors } = options;
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
      Math.max(0, fade) * floorAlpha(scene.areaFloor[i] ?? 0, activeFloor(options)),
    );
  }
}

function drawSceneFlights(
  context: CanvasRenderingContext2D,
  g: PlateGeometry,
  options: TacticLayerOptions,
  scene: TacticScene,
): void {
  const { colors } = options;
  for (let i = 0; i < scene.flightCount; i++) {
    context.save();
    context.globalAlpha = floorAlpha(scene.flightFloor[i] ?? 0, activeFloor(options));
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
    context.restore();
  }
}

function drawPlayback(
  context: CanvasRenderingContext2D,
  g: PlateGeometry,
  options: TacticLayerOptions,
): void {
  const { schedule, scene, colors, clock } = options;
  sampleScene(schedule, clock.time, scene);
  const step = schedule.steps[scene.stepIndex];
  const local = clock.time - (step?.startSeconds ?? 0);

  const active = activeFloor(options);
  drawSceneAreas(context, g, options, scene);
  for (const leg of step?.legs ?? []) {
    if (leg.isDead || leg.lengthPx < 1) continue;
    const color = slotInk(options, leg.slot);
    strokeLeg(context, leg, g, {
      color,
      under: colors.hollow,
      width: 2,
      alpha: 0.45,
      dash: [3, 7],
      activeFloor: active,
    });
    drawLegLinks(context, leg, g, floorRefsOf(options.overview), {
      color,
      ground: colors.hollow,
      active,
      alpha: 0.6,
    });
    const travelled = Math.max(0, (local - leg.delaySeconds) * leg.speedPxPerSecond);
    let upTo = 0;
    while (upTo < leg.xs.length - 1 && (leg.cum[upTo + 1] ?? 0) <= travelled) upTo++;
    strokeLeg(
      context,
      leg,
      g,
      { color, under: colors.hollow, width: 3.5, alpha: 1, activeFloor: active },
      {
        upTo,
        endX: scene.playerX[leg.slot] ?? 0,
        endY: scene.playerY[leg.slot] ?? 0,
      },
    );
  }
  drawSceneFlights(context, g, options, scene);
}

function faintRoutes(
  context: CanvasRenderingContext2D,
  g: PlateGeometry,
  legs: readonly PlayerLeg[],
  stroke: RouteStroke,
): void {
  for (let i = 0; i < legs.length; i++) {
    const leg = legs[i];
    if (leg === undefined || leg.isDead || leg.lengthPx < 1) continue;
    strokeLeg(context, leg, g, stroke);
  }
}

function drawOpponentMark(
  context: CanvasRenderingContext2D,
  g: PlateGeometry,
  options: TacticLayerOptions,
  x: number,
  y: number,
  floor: number,
  isDead: boolean,
): void {
  const { colors } = options;
  const side = oppositeSide(options.side);
  context.save();
  context.globalAlpha = floorAlpha(floor, activeFloor(options));
  drawEnemyMark(
    context,
    x * g.scale + g.offsetX,
    y * g.scale + g.offsetY,
    g.tokenRadius * 1.05,
    isDead ? colors.dead : colors.team[side],
    colors.hollow,
    colors.hollow,
    isDead ? '✕' : side,
    isDead ? 1.3 : 0.9,
  );
  context.restore();
}

/** The opponents' step while it is edited-for-view: faint routes, earlier areas, then this step's throws. */
function drawOpponentStep(
  context: CanvasRenderingContext2D,
  g: PlateGeometry,
  options: TacticLayerOptions,
  opponents: TacticOpponents,
  stroke: RouteStroke,
  nowMs: number,
): void {
  const ink = options.colors.team[oppositeSide(options.side)];
  const step = opponents.schedule.steps[options.stepIndex];
  drawEarlierAreas(context, g, options, opponents.schedule);
  if (step === undefined) return;
  faintRoutes(context, g, step.legs, stroke);
  for (let i = 0; i < step.throws.length; i++) {
    const thrown = step.throws[i];
    if (thrown === undefined) continue;
    const fade = floorAlpha(thrown.floor, activeFloor(options));
    drawUtilityHaloArea(
      context,
      thrown.toX * g.scale + g.offsetX,
      thrown.toY * g.scale + g.offsetY,
      thrown.kind,
      options.overview,
      g,
      options.colors,
      fade,
    );
    drawArc(context, thrown, g, options, ink, fade, nowMs);
    drawThrowIcon(context, thrown, g, options, ink, 1);
  }
}

function drawOpponentPlayback(
  context: CanvasRenderingContext2D,
  g: PlateGeometry,
  options: TacticLayerOptions,
  opponents: TacticOpponents,
  stroke: RouteStroke,
): void {
  const { schedule, scene } = opponents;
  sampleScene(schedule, options.clock.time, scene);
  drawSceneAreas(context, g, options, scene);
  faintRoutes(context, g, schedule.steps[scene.stepIndex]?.legs ?? NO_LEGS, stroke);
  drawSceneFlights(context, g, options, scene);
}

/** Under the team's own routes: the opponents' routes, areas and throws, for the step or the clock. */
function drawOpponentsUnder(
  context: CanvasRenderingContext2D,
  g: PlateGeometry,
  options: TacticLayerOptions,
  stroke: RouteStroke,
  nowMs: number,
): void {
  const { opponents } = options;
  if (opponents === undefined) return;
  if (options.clock.isShown) drawOpponentPlayback(context, g, options, opponents, stroke);
  else drawOpponentStep(context, g, options, opponents, stroke, nowMs);
}

function drawOpponentTokens(
  context: CanvasRenderingContext2D,
  g: PlateGeometry,
  options: TacticLayerOptions,
): void {
  if (options.opponents === undefined) return;
  const { schedule, scene } = options.opponents;
  const isPlayback = options.clock.isShown;
  const legs = schedule.steps[options.stepIndex]?.legs;
  for (let slot = 0; slot < schedule.slotCount; slot++) {
    if (isPlayback) {
      drawOpponentMark(
        context,
        g,
        options,
        scene.playerX[slot] ?? 0,
        scene.playerY[slot] ?? 0,
        scene.playerFloor[slot] ?? 0,
        scene.isDead[slot] === 1,
      );
      continue;
    }
    const leg = legs?.[slot];
    if (leg === undefined) continue;
    drawOpponentMark(
      context,
      g,
      options,
      leg.xs[0] ?? 0,
      leg.ys[0] ?? 0,
      leg.floors[0] ?? 0,
      leg.isDead,
    );
  }
}

/**
 * The tactic board's layer, for the step edited or the plan playing. Bottom to top: drawings, spawn
 * spots, lineup marks, the opponents' routes and grenades, routes, grenades and handles, expected
 * enemies, the opponents' tokens, then the players' tokens.
 */
export function tacticLayer(options: TacticLayerOptions): Layer {
  const geometry: PlateGeometry = plateGeometry();
  const enemyDrawing: EnemyDrawing = {
    overview: options.overview,
    colors: options.colors,
    slotColors: options.slotColors,
    enemySide: oppositeSide(options.side),
    selectedId: null,
    roleLabels: options.enemyRoleLabels,
    text: createEnemyTextCache(),
    marks: undefined,
    legs: undefined,
    dashOffset: 0,
    floor: activeFloor(options),
  };
  const opponentStroke: RouteStroke = {
    color: options.colors.team[oppositeSide(options.side)],
    under: options.colors.hollow,
    width: 2,
    alpha: OPPONENT_ALPHA,
    dash: OPPONENT_DASH,
    activeFloor: activeFloor(options),
  };

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
          activeFloor(options),
        );
      }
      drawLineupMarkers(
        context,
        options.lineups ?? [],
        options.hoveredLineupId,
        options.overview,
        geometry,
        options.colors,
        activeFloor(options),
      );
      drawOpponentsUnder(context, geometry, options, opponentStroke, nowMs);
      drawEditScene(context, geometry, options, nowMs);
      enemyDrawing.marks = options.enemyMarks[options.stepIndex];
      enemyDrawing.legs = options.schedule.steps[options.stepIndex]?.legs;
      enemyDrawing.selectedId = options.selectedEnemyId;
      enemyDrawing.dashOffset = marchOffset(options.motion, nowMs);
    } else {
      drawOpponentsUnder(context, geometry, options, opponentStroke, nowMs);
      drawPlayback(context, geometry, options);
      enemyDrawing.marks = options.enemyMarks[options.scene.stepIndex];
      enemyDrawing.legs = undefined;
      enemyDrawing.selectedId = null;
    }
    drawEnemies(context, geometry, enemyDrawing);
    drawOpponentTokens(context, geometry, options);
    drawTokens(context, geometry, options, nowMs);
    options.motion.isPriming = false;
  };
}
