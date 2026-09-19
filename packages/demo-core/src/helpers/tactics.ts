import { THROWN_UTILITY_KINDS, type UtilityKind } from './utility';

export type TacticSide = 'CT' | 'T';

export const TACTIC_SIDES: readonly TacticSide[] = ['CT', 'T'] as const;

export const TACTIC_SCHEMA_VERSION = 1;

export interface TacticPoint {
  readonly x: number;
  readonly y: number;
  readonly z?: number | undefined;
}

export interface TacticPlayerPosition {
  readonly slot: number;
  readonly x: number;
  readonly y: number;
  readonly yaw?: number | undefined;
  readonly label?: string | undefined;
}

export interface TacticThrow {
  readonly id: string;
  readonly throwerSlot: number;
  readonly kind: UtilityKind;
  readonly from: TacticPoint;
  readonly to: TacticPoint;
  readonly releaseTime: number;
  readonly notes?: string | undefined;
}

export interface TacticDrawingStroke {
  readonly id: string;
  readonly color: string;
  readonly points: readonly TacticPoint[];
}

export interface TacticStep {
  readonly id: string;
  readonly name: string;
  readonly timeOffsetSeconds: number;
  readonly players: readonly TacticPlayerPosition[];
  readonly throws: readonly TacticThrow[];
  readonly drawings?: readonly TacticDrawingStroke[] | undefined;
  readonly notes?: string | undefined;
}

export interface Tactic {
  readonly id: string;
  readonly title: string;
  readonly map: string;
  readonly side: TacticSide;
  readonly steps: readonly TacticStep[];
  readonly author?: string | undefined;
  readonly description?: string | undefined;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface TacticFile {
  readonly version: 1;
  readonly generator: 'disalytics';
  readonly exportedAt: string;
  readonly tactics: readonly Tactic[];
}

export class TacticFileError extends Error {
  readonly code: 'INVALID_JSON' | 'UNSUPPORTED_VERSION' | 'INVALID_SCHEMA';

  constructor(message: string, code: 'INVALID_JSON' | 'UNSUPPORTED_VERSION' | 'INVALID_SCHEMA') {
    super(message);
    this.name = 'TacticFileError';
    this.code = code;
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isPoint(value: unknown): value is TacticPoint {
  if (!isObject(value)) return false;
  return isFiniteNumber(value.x) && isFiniteNumber(value.y);
}

function isPlayerPosition(value: unknown): value is TacticPlayerPosition {
  if (!isObject(value)) return false;
  if (!isFiniteNumber(value.slot) || !isFiniteNumber(value.x) || !isFiniteNumber(value.y)) {
    return false;
  }
  if (value.yaw !== undefined && !isFiniteNumber(value.yaw)) {
    return false;
  }
  if (value.label !== undefined && typeof value.label !== 'string') {
    return false;
  }
  return true;
}

function isTacticThrow(value: unknown): value is TacticThrow {
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
  if (value.notes !== undefined && typeof value.notes !== 'string') {
    return false;
  }
  return true;
}

function isDrawingStroke(value: unknown): value is TacticDrawingStroke {
  if (!isObject(value)) return false;
  if (typeof value.id !== 'string' || typeof value.color !== 'string') {
    return false;
  }
  if (!Array.isArray(value.points) || !value.points.every(isPoint)) {
    return false;
  }
  return true;
}

function isTacticStep(value: unknown): value is TacticStep {
  if (!isObject(value)) return false;
  if (typeof value.id !== 'string' || typeof value.name !== 'string') {
    return false;
  }
  if (!isFiniteNumber(value.timeOffsetSeconds)) {
    return false;
  }
  if (!Array.isArray(value.players) || !value.players.every(isPlayerPosition)) {
    return false;
  }
  if (!Array.isArray(value.throws) || !value.throws.every(isTacticThrow)) {
    return false;
  }
  if (value.drawings !== undefined) {
    if (!Array.isArray(value.drawings) || !value.drawings.every(isDrawingStroke)) {
      return false;
    }
  }
  if (value.notes !== undefined && typeof value.notes !== 'string') {
    return false;
  }
  return true;
}

export function isTactic(value: unknown): value is Tactic {
  if (!isObject(value)) return false;
  if (
    typeof value.id !== 'string' ||
    typeof value.title !== 'string' ||
    typeof value.map !== 'string'
  ) {
    return false;
  }
  if (value.side !== 'CT' && value.side !== 'T') {
    return false;
  }
  if (!Array.isArray(value.steps) || !value.steps.every(isTacticStep)) {
    return false;
  }
  if (value.author !== undefined && typeof value.author !== 'string') {
    return false;
  }
  if (value.description !== undefined && typeof value.description !== 'string') {
    return false;
  }
  if (!isFiniteNumber(value.createdAt) || !isFiniteNumber(value.updatedAt)) {
    return false;
  }
  return true;
}

export function serializeTacticFile(tactics: Tactic | readonly Tactic[]): string {
  const list = Array.isArray(tactics) ? tactics : [tactics];
  const file: TacticFile = {
    version: 1,
    generator: 'disalytics',
    exportedAt: new Date().toISOString(),
    tactics: list,
  };
  return JSON.stringify(file, null, 2);
}

export function parseTacticFile(json: string): readonly Tactic[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new TacticFileError('Invalid JSON format', 'INVALID_JSON');
  }

  if (!isObject(parsed)) {
    throw new TacticFileError('Expected an object at root', 'INVALID_SCHEMA');
  }

  if (parsed.version !== 1) {
    throw new TacticFileError(
      `Unsupported schema version ${String(parsed.version)}`,
      'UNSUPPORTED_VERSION',
    );
  }

  if (parsed.generator !== 'disalytics') {
    throw new TacticFileError('Invalid generator identifier', 'INVALID_SCHEMA');
  }

  let candidates: unknown[];
  if (Array.isArray(parsed.tactics)) {
    candidates = parsed.tactics;
  } else if (isObject(parsed.tactic)) {
    candidates = [parsed.tactic];
  } else {
    throw new TacticFileError('Missing tactics array', 'INVALID_SCHEMA');
  }

  const validTactics: Tactic[] = [];
  for (const item of candidates) {
    if (isTactic(item)) {
      validTactics.push(item);
    } else {
      throw new TacticFileError('Invalid tactic object in file', 'INVALID_SCHEMA');
    }
  }

  return validTactics;
}

function toBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    if (b !== undefined) {
      binary += String.fromCharCode(b);
    }
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(base64url: string): string {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

/**
 * Encodes a tactic into a URL fragment identifier string (e.g. `#tactic=...`).
 */
export function encodeTacticToHash(tactic: Tactic): string {
  const json = JSON.stringify(tactic);
  return `#tactic=${toBase64Url(json)}`;
}

/**
 * Decodes a tactic from a URL fragment or raw hash string. Returns null if invalid or corrupt.
 */
export function decodeTacticFromHash(hashOrUrl: string): Tactic | null {
  try {
    let raw = hashOrUrl;
    const hashIdx = raw.indexOf('#');
    if (hashIdx !== -1) {
      raw = raw.slice(hashIdx + 1);
    }
    const prefix = 'tactic=';
    if (raw.startsWith(prefix)) {
      raw = raw.slice(prefix.length);
    }

    if (!raw) return null;

    const json = fromBase64Url(raw);
    const parsed: unknown = JSON.parse(json);
    return isTactic(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
