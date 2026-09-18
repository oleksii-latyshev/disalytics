import type { PlayerSlot } from '@disa/demo-core';
import type { RadarPoint } from '@disa/map-data';

export type CoachTool = 'pencil' | 'eraser' | 'move' | 'smoke' | 'molotov' | 'flash' | 'he';

export type CoachPencilColor = 'objective' | 'ct' | 't' | 'damage' | 'ink';

export const COACH_PENCIL_COLORS: readonly CoachPencilColor[] = [
  'objective',
  'ct',
  't',
  'damage',
  'ink',
];

export interface CoachStroke {
  readonly id: string;
  readonly color: string;
  readonly points: readonly RadarPoint[];
}

export type CoachUtilityKind = 'smoke' | 'molotov' | 'flash' | 'he';

export interface CoachUtility {
  readonly id: string;
  readonly kind: CoachUtilityKind;
  readonly point: RadarPoint;
}

export interface CoachMovedPlayer {
  readonly slot: PlayerSlot;
  readonly point: RadarPoint;
}

export interface CoachAnnotations {
  readonly strokes: readonly CoachStroke[];
  readonly utilities: readonly CoachUtility[];
  readonly movedPlayers: readonly CoachMovedPlayer[];
}

export const EMPTY_COACH_ANNOTATIONS: CoachAnnotations = {
  strokes: [],
  utilities: [],
  movedPlayers: [],
};

const MAX_HISTORY_STEPS = 50;

export interface CoachHistory {
  readonly past: readonly CoachAnnotations[];
  readonly present: CoachAnnotations;
  readonly future: readonly CoachAnnotations[];
}

export function createCoachHistory(
  initial: CoachAnnotations = EMPTY_COACH_ANNOTATIONS,
): CoachHistory {
  return {
    past: [],
    present: initial,
    future: [],
  };
}

export function pushCoachSnapshot(history: CoachHistory, next: CoachAnnotations): CoachHistory {
  const past = [...history.past, history.present];
  if (past.length > MAX_HISTORY_STEPS) {
    past.shift();
  }

  return {
    past,
    present: next,
    future: [],
  };
}

export function undoCoachHistory(history: CoachHistory): CoachHistory | null {
  if (history.past.length === 0) return null;

  const previous = history.past[history.past.length - 1];
  if (previous === undefined) return null;
  const past = history.past.slice(0, -1);

  return {
    past,
    present: previous,
    future: [history.present, ...history.future],
  };
}

export function redoCoachHistory(history: CoachHistory): CoachHistory | null {
  if (history.future.length === 0) return null;

  const next = history.future[0];
  if (next === undefined) return null;
  const future = history.future.slice(1);

  return {
    past: [...history.past, history.present],
    present: next,
    future,
  };
}
