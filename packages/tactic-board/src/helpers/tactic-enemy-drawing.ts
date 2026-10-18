import type { TacticEnemy, TacticEnemyRole, TacticSide } from '@disa/demo-core';
import { type MapOverview, radarX, radarY } from '@disa/map-data';
import type { PlateGeometry, RadarColors } from '@disa/plate';
import type { SlotColors } from './tactic-colors';
import type { EnemyMarks } from './tactic-enemies';
import { floorOfPoint } from './tactic-route';
import { floorAlpha } from './tactic-route-drawing';
import type { PlayerLeg } from './tactic-schedule';

export type EnemyRoleLabels = Readonly<Record<TacticEnemyRole, string>>;

/** Note text and its width, held so the draw measures a string once. */
export interface EnemyTextCache {
  readonly widths: Map<string, number>;
}

export function createEnemyTextCache(): EnemyTextCache {
  return { widths: new Map() };
}

export interface EnemyDrawing {
  readonly overview: MapOverview;
  readonly colors: RadarColors;
  readonly slotColors: SlotColors;
  /** The side the enemies are on: the opposite of the tactic's own. */
  readonly enemySide: TacticSide;
  readonly roleLabels: EnemyRoleLabels;
  readonly text: EnemyTextCache;
  /** Set before each paint: the enemy picked, and what the step in view shows. */
  selectedId: string | null;
  marks: EnemyMarks | undefined;
  /** Set before each paint: where each of ours stands at the end of the step; undefined while a plan plays. */
  legs: readonly PlayerLeg[] | undefined;
  dashOffset: number;
  /** The floor in view; marks on another one are faded. */
  floor: number;
}

const NOTE_FONT = '500 11px Onest, sans-serif';
const NOTE_PADDING = 6;
const NOTE_HEIGHT = 18;
const NOTE_MAX_WIDTH = 150;
const NO_DASH: number[] = [];
const KILL_DASH = [6, 6];

function markPath(context: CanvasRenderingContext2D, x: number, y: number, half: number): void {
  context.beginPath();
  context.roundRect(x - half, y - half, half * 2, half * 2, half * 0.35);
}

const MARK_FONTS = new Map<number, string>();

function markFont(size: number): string {
  let font = MARK_FONTS.get(size);
  if (font === undefined) {
    font = `700 ${size}px IBM Plex Mono, monospace`;
    MARK_FONTS.set(size, font);
  }
  return font;
}

/** The rounded square that stands for the other side: filled, outlined, with a glyph inside. */
export function drawEnemyMark(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  half: number,
  fill: string,
  outline: string,
  ink: string,
  text: string,
  textScale: number,
): void {
  context.fillStyle = fill;
  context.strokeStyle = outline;
  context.lineWidth = 2;
  markPath(context, x, y, half);
  context.fill();
  context.stroke();
  context.fillStyle = ink;
  context.font = markFont(Math.round(half * textScale));
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, x, y + 0.5);
}

function drawGhost(
  context: CanvasRenderingContext2D,
  g: PlateGeometry,
  drawing: EnemyDrawing,
  enemy: TacticEnemy,
): void {
  const x = radarX(drawing.overview, enemy.at.x) * g.scale + g.offsetX;
  const y = radarY(drawing.overview, enemy.at.y) * g.scale + g.offsetY;
  context.save();
  context.globalAlpha = 0.85 * floorAlpha(floorOfPoint(drawing.overview, enemy.at), drawing.floor);
  drawEnemyMark(
    context,
    x,
    y,
    g.tokenRadius * 1.0,
    drawing.colors.dead,
    drawing.colors.team[drawing.enemySide],
    drawing.colors.hollow,
    '✕',
    1.3,
  );
  context.restore();
}

function drawTakerLine(
  context: CanvasRenderingContext2D,
  g: PlateGeometry,
  drawing: EnemyDrawing,
  enemy: TacticEnemy,
): void {
  const leg = enemy.killedBy === undefined ? undefined : drawing.legs?.[enemy.killedBy];
  if (leg === undefined || leg.isDead) return;
  const last = leg.xs.length - 1;
  const fromX = (leg.xs[last] ?? 0) * g.scale + g.offsetX;
  const fromY = (leg.ys[last] ?? 0) * g.scale + g.offsetY;
  const toX = radarX(drawing.overview, enemy.at.x) * g.scale + g.offsetX;
  const toY = radarY(drawing.overview, enemy.at.y) * g.scale + g.offsetY;
  const fade = floorAlpha(floorOfPoint(drawing.overview, enemy.at), drawing.floor);
  context.save();
  context.lineCap = 'round';
  context.setLineDash(NO_DASH);
  context.globalAlpha = 0.7 * fade;
  context.strokeStyle = drawing.colors.hollow;
  context.lineWidth = 5;
  context.beginPath();
  context.moveTo(fromX, fromY);
  context.lineTo(toX, toY);
  context.stroke();
  context.globalAlpha = fade;
  context.strokeStyle = drawing.slotColors[enemy.killedBy ?? 0] ?? drawing.colors.killLine;
  context.lineWidth = 2.5;
  context.setLineDash(KILL_DASH);
  context.lineDashOffset = drawing.dashOffset;
  context.beginPath();
  context.moveTo(fromX, fromY);
  context.lineTo(toX, toY);
  context.stroke();
  context.restore();
}

function noteOf(drawing: EnemyDrawing, enemy: TacticEnemy): string {
  const note = enemy.note?.trim();
  if (note !== undefined && note !== '') return note;
  return enemy.role === undefined ? '' : drawing.roleLabels[enemy.role];
}

function drawNote(
  context: CanvasRenderingContext2D,
  drawing: EnemyDrawing,
  note: string,
  x: number,
  y: number,
  fade: number,
): void {
  context.font = NOTE_FONT;
  let width = drawing.text.widths.get(note);
  if (width === undefined) {
    width = Math.min(NOTE_MAX_WIDTH, context.measureText(note).width);
    drawing.text.widths.set(note, width);
  }
  const boxWidth = width + NOTE_PADDING * 2;
  context.fillStyle = drawing.colors.hollow;
  context.globalAlpha = 0.88 * fade;
  context.strokeStyle = drawing.colors.team[drawing.enemySide];
  context.lineWidth = 1;
  context.beginPath();
  context.roundRect(x, y - NOTE_HEIGHT / 2, boxWidth, NOTE_HEIGHT, 5);
  context.fill();
  context.globalAlpha = fade;
  context.stroke();
  context.fillStyle = drawing.colors.selectionRing;
  context.textAlign = 'left';
  context.textBaseline = 'middle';
  context.fillText(note, x + NOTE_PADDING, y + 0.5, NOTE_MAX_WIDTH);
}

function drawEnemy(
  context: CanvasRenderingContext2D,
  g: PlateGeometry,
  drawing: EnemyDrawing,
  enemy: TacticEnemy,
): void {
  const { colors } = drawing;
  const x = radarX(drawing.overview, enemy.at.x) * g.scale + g.offsetX;
  const y = radarY(drawing.overview, enemy.at.y) * g.scale + g.offsetY;
  const half = g.tokenRadius * 1.1;
  const isDead = enemy.isDead === true;

  const fade = floorAlpha(floorOfPoint(drawing.overview, enemy.at), drawing.floor);
  context.save();
  context.globalAlpha = fade;
  if (drawing.selectedId === enemy.id) {
    context.strokeStyle = colors.selectionRing;
    context.lineWidth = 3;
    markPath(context, x, y, half + 4);
    context.stroke();
  }
  drawEnemyMark(
    context,
    x,
    y,
    half,
    isDead ? colors.dead : colors.team[drawing.enemySide],
    colors.hollow,
    colors.hollow,
    isDead ? '✕' : drawing.enemySide,
    isDead ? 1.3 : 0.95,
  );

  const note = noteOf(drawing, enemy);
  if (note !== '') drawNote(context, drawing, note, x + half + 5, y, fade);
  context.restore();
}

/**
 * What the plan expects of the other side, as static marks: earlier steps' dead as ghosts, a line
 * from whoever takes each enemy, then the marks with their notes.
 *
 * perf: runs on every paint — no allocation beyond the first measure of a note.
 */
export function drawEnemies(
  context: CanvasRenderingContext2D,
  g: PlateGeometry,
  drawing: EnemyDrawing,
): void {
  const { marks } = drawing;
  if (marks === undefined) return;
  for (let i = 0; i < marks.ghosts.length; i++) {
    const ghost = marks.ghosts[i];
    if (ghost !== undefined) drawGhost(context, g, drawing, ghost);
  }
  for (let i = 0; i < marks.live.length; i++) {
    const enemy = marks.live[i];
    if (enemy !== undefined) drawTakerLine(context, g, drawing, enemy);
  }
  for (let i = 0; i < marks.live.length; i++) {
    const enemy = marks.live[i];
    if (enemy !== undefined) drawEnemy(context, g, drawing, enemy);
  }
}
