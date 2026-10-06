import type { TacticDrawingStroke, TacticPoint, TacticThrow } from './tactics';
import { THROWN_UTILITY_KINDS, type UtilityKind } from './utility';

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function isPoint(value: unknown): value is TacticPoint {
  if (!isObject(value)) return false;
  if (!isFiniteNumber(value.x) || !isFiniteNumber(value.y)) return false;
  return value.z === undefined || isFiniteNumber(value.z);
}

export function isTacticThrow(value: unknown): value is TacticThrow {
  if (!isObject(value)) return false;
  if (typeof value.id !== 'string' || !isFiniteNumber(value.throwerSlot)) {
    return false;
  }
  if (!THROWN_UTILITY_KINDS.includes(value.kind as UtilityKind)) {
    return false;
  }
  if (!isPoint(value.from) || !isPoint(value.to)) {
    return false;
  }
  if (!isFiniteNumber(value.releaseTime)) {
    return false;
  }
  if (value.lineupId !== undefined && typeof value.lineupId !== 'string') {
    return false;
  }
  if (value.droppedBy !== undefined && !isFiniteNumber(value.droppedBy)) {
    return false;
  }
  if (value.notes !== undefined && typeof value.notes !== 'string') {
    return false;
  }
  return true;
}

export function isDrawingStroke(value: unknown): value is TacticDrawingStroke {
  if (!isObject(value)) return false;
  if (typeof value.id !== 'string' || typeof value.color !== 'string') {
    return false;
  }
  return Array.isArray(value.points) && value.points.every(isPoint);
}
