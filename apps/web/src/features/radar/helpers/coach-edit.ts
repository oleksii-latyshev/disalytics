import type { PlayerSlot } from '@disa/demo-core';
import type { RadarPoint } from '@disa/map-data';
import { findHitPlayerToken, findHitStroke, findHitUtility, pointDistance } from './coach-draw';
import type {
  CoachAnnotations,
  CoachMovedPlayer,
  CoachTool,
  CoachUtilityKind,
} from './coach-types';

export type CoachGesture =
  | { readonly kind: 'stroke'; readonly id: string }
  | { readonly kind: 'utility'; readonly id: string }
  | { readonly kind: 'player'; readonly slot: PlayerSlot }
  | { readonly kind: 'erase' };

export interface GestureStart {
  readonly gesture: CoachGesture;
  readonly annotations: CoachAnnotations;
}

export interface CoachHover {
  readonly utilityId: string | null;
  readonly playerSlot: PlayerSlot | null;
}

export type OriginalPlayerPoints = ReadonlyMap<PlayerSlot, RadarPoint>;

const MIN_STROKE_STEP_UNITS = 1.5;

let idCounter = 0;

export function nextCoachId(): string {
  idCounter += 1;

  return `coach-${idCounter}`;
}

export function isUtilityTool(tool: CoachTool): tool is CoachUtilityKind {
  return tool === 'smoke' || tool === 'molotov' || tool === 'flash' || tool === 'he';
}

export function eraseAt(
  annotations: CoachAnnotations,
  originals: OriginalPlayerPoints,
  point: RadarPoint,
): CoachAnnotations {
  const utility = findHitUtility(annotations.utilities, point);
  if (utility !== null) {
    return { ...annotations, utilities: annotations.utilities.filter((u) => u.id !== utility.id) };
  }

  const stroke = findHitStroke(annotations.strokes, point);
  if (stroke !== null) {
    return { ...annotations, strokes: annotations.strokes.filter((s) => s.id !== stroke.id) };
  }

  const player = findHitPlayerToken(originals, annotations.movedPlayers, point);
  if (player?.isMoved === true) {
    return {
      ...annotations,
      movedPlayers: annotations.movedPlayers.filter((m) => m.slot !== player.slot),
    };
  }

  return annotations;
}

export function beginGesture(
  tool: CoachTool,
  annotations: CoachAnnotations,
  originals: OriginalPlayerPoints,
  point: RadarPoint,
  color: string,
): GestureStart | null {
  if (isUtilityTool(tool)) {
    const utility = { id: nextCoachId(), kind: tool, point };

    return {
      gesture: { kind: 'utility', id: utility.id },
      annotations: { ...annotations, utilities: [...annotations.utilities, utility] },
    };
  }

  switch (tool) {
    case 'pencil': {
      const stroke = { id: nextCoachId(), color, points: [point] };

      return {
        gesture: { kind: 'stroke', id: stroke.id },
        annotations: { ...annotations, strokes: [...annotations.strokes, stroke] },
      };
    }
    case 'eraser':
      return { gesture: { kind: 'erase' }, annotations: eraseAt(annotations, originals, point) };
    case 'move': {
      const utility = findHitUtility(annotations.utilities, point);
      if (utility !== null) return { gesture: { kind: 'utility', id: utility.id }, annotations };

      const player = findHitPlayerToken(originals, annotations.movedPlayers, point);
      if (player !== null) return { gesture: { kind: 'player', slot: player.slot }, annotations };

      return null;
    }
  }
}

function withMovedPlayer(
  movedPlayers: readonly CoachMovedPlayer[],
  slot: PlayerSlot,
  point: RadarPoint,
): readonly CoachMovedPlayer[] {
  return [...movedPlayers.filter((m) => m.slot !== slot), { slot, point }];
}

export function advanceGesture(
  annotations: CoachAnnotations,
  gesture: CoachGesture,
  originals: OriginalPlayerPoints,
  point: RadarPoint,
): CoachAnnotations {
  switch (gesture.kind) {
    case 'stroke': {
      const stroke = annotations.strokes.find((s) => s.id === gesture.id);
      const last = stroke?.points[stroke.points.length - 1];
      if (stroke === undefined || last === undefined) return annotations;
      if (pointDistance(last, point) < MIN_STROKE_STEP_UNITS) return annotations;

      const extended = { ...stroke, points: [...stroke.points, point] };

      return {
        ...annotations,
        strokes: annotations.strokes.map((s) => (s.id === gesture.id ? extended : s)),
      };
    }
    case 'utility':
      return {
        ...annotations,
        utilities: annotations.utilities.map((u) => (u.id === gesture.id ? { ...u, point } : u)),
      };
    case 'player':
      return {
        ...annotations,
        movedPlayers: withMovedPlayer(annotations.movedPlayers, gesture.slot, point),
      };
    case 'erase':
      return eraseAt(annotations, originals, point);
  }
}

export function hoverAt(
  annotations: CoachAnnotations,
  originals: OriginalPlayerPoints,
  point: RadarPoint,
): CoachHover {
  return {
    utilityId: findHitUtility(annotations.utilities, point)?.id ?? null,
    playerSlot: findHitPlayerToken(originals, annotations.movedPlayers, point)?.slot ?? null,
  };
}
