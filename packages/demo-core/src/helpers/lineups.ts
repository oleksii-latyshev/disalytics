import type { Team, WorldPoint } from '../schema';
import type { MovementKey, ThrowType } from './throw-detail';
import { THROWN_UTILITY_KINDS, type UtilityKind } from './utility';

export type LineupSide = Team | 'BOTH';
export type LineupMouseButton = 'left' | 'right';
export type LineupGroupTarget = 'landing' | 'origin';

export const LINEUP_SIDES: readonly LineupSide[] = ['CT', 'T', 'BOTH'] as const;

export const THROW_TYPES: readonly ThrowType[] = [
  'stand',
  'run',
  'jump',
  'crouch',
  'unknown',
] as const;

export interface Lineup {
  readonly id: string;
  readonly title: string;
  readonly map: string;
  readonly side: LineupSide;
  readonly kind: UtilityKind;
  readonly targetCallout?: string;
  readonly origin: WorldPoint;
  readonly landing: WorldPoint;
  readonly waypoints?: readonly WorldPoint[] | undefined;
  readonly groupId?: string | undefined;
  readonly groupTarget?: LineupGroupTarget | undefined;
  readonly pitch: number;
  readonly yaw: number;
  readonly throwType: ThrowType;
  readonly movementKeys: readonly MovementKey[];
  readonly movementKeysSummary: string;
  readonly mouseButtons?: readonly LineupMouseButton[];
  readonly command: string;
  readonly landingCommand?: string;
  readonly fromDemo?: boolean;
  readonly notes?: string;
  readonly movementInstructions?: string;
  readonly mediaUrl?: string;
  readonly imageUrls?: readonly string[];
  readonly imageCaptions?: readonly string[];
  readonly isBuiltIn?: boolean;
  readonly createdAt: number;
}

export interface LineupFile {
  readonly version: 1;
  readonly generator: 'disalytics';
  readonly exportedAt: string;
  readonly lineups: readonly Lineup[];
}

export class LineupFileError extends Error {
  readonly code: 'INVALID_JSON' | 'UNSUPPORTED_VERSION' | 'INVALID_SCHEMA';

  constructor(message: string, code: 'INVALID_JSON' | 'UNSUPPORTED_VERSION' | 'INVALID_SCHEMA') {
    super(message);
    this.name = 'LineupFileError';
    this.code = code;
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isWorldPoint(value: unknown): value is WorldPoint {
  return (
    isObject(value) && isFiniteNumber(value.x) && isFiniteNumber(value.y) && isFiniteNumber(value.z)
  );
}

function hasValidText(id: unknown, title: unknown, map: unknown): boolean {
  return (
    typeof id === 'string' &&
    id.trim().length > 0 &&
    typeof title === 'string' &&
    title.trim().length > 0 &&
    typeof map === 'string' &&
    map.trim().length > 0
  );
}

function hasValidClassification(side: unknown, kind: unknown, throwType: unknown): boolean {
  return (
    typeof side === 'string' &&
    LINEUP_SIDES.includes(side as LineupSide) &&
    typeof kind === 'string' &&
    THROWN_UTILITY_KINDS.includes(kind as UtilityKind) &&
    typeof throwType === 'string' &&
    THROW_TYPES.includes(throwType as ThrowType)
  );
}

function hasValidGeometry(
  origin: unknown,
  landing: unknown,
  pitch: unknown,
  yaw: unknown,
): boolean {
  return (
    isWorldPoint(origin) && isWorldPoint(landing) && isFiniteNumber(pitch) && isFiniteNumber(yaw)
  );
}

function hasValidCommand(
  movementKeys: unknown,
  movementKeysSummary: unknown,
  command: unknown,
): boolean {
  return (
    Array.isArray(movementKeys) &&
    typeof movementKeysSummary === 'string' &&
    typeof command === 'string'
  );
}

function hasValidOptionals(
  notes: unknown,
  mediaUrl: unknown,
  isBuiltIn: unknown,
  createdAt: unknown,
  landingCommand: unknown,
  fromDemo: unknown,
  targetCallout: unknown,
  waypoints: unknown,
  groupId: unknown,
  groupTarget: unknown,
): boolean {
  if (notes !== undefined && typeof notes !== 'string') return false;
  if (mediaUrl !== undefined && typeof mediaUrl !== 'string') return false;
  if (isBuiltIn !== undefined && typeof isBuiltIn !== 'boolean') return false;
  if (createdAt !== undefined && !isFiniteNumber(createdAt)) return false;
  if (landingCommand !== undefined && typeof landingCommand !== 'string') return false;
  if (fromDemo !== undefined && typeof fromDemo !== 'boolean') return false;
  if (targetCallout !== undefined && typeof targetCallout !== 'string') return false;
  if (waypoints !== undefined) {
    if (!Array.isArray(waypoints) || !waypoints.every(isWorldPoint)) return false;
  }
  if (groupId !== undefined && (typeof groupId !== 'string' || groupId.trim().length === 0)) {
    return false;
  }
  if (groupTarget !== undefined && groupTarget !== 'landing' && groupTarget !== 'origin') {
    return false;
  }
  return true;
}

function isImageUrl(value: unknown): value is string {
  return typeof value === 'string' && /^https?:\/\/[^\s]+$/i.test(value);
}

function hasValidInstructions(
  movementInstructions: unknown,
  imageUrls: unknown,
  imageCaptions: unknown,
  mouseButtons: unknown,
): boolean {
  if (movementInstructions !== undefined && typeof movementInstructions !== 'string') {
    return false;
  }
  if (imageUrls !== undefined) {
    if (!Array.isArray(imageUrls) || !imageUrls.every(isImageUrl)) {
      return false;
    }
  }
  if (imageCaptions !== undefined) {
    if (
      !Array.isArray(imageCaptions) ||
      !imageCaptions.every((caption) => typeof caption === 'string') ||
      !Array.isArray(imageUrls) ||
      imageCaptions.length !== imageUrls.length
    ) {
      return false;
    }
  }
  if (
    mouseButtons !== undefined &&
    (!Array.isArray(mouseButtons) ||
      !mouseButtons.every((button) => button === 'left' || button === 'right') ||
      new Set(mouseButtons).size !== mouseButtons.length)
  ) {
    return false;
  }
  return true;
}

export function isLineup(value: unknown): value is Lineup {
  if (!isObject(value)) return false;

  return (
    hasValidText(value.id, value.title, value.map) &&
    hasValidClassification(value.side, value.kind, value.throwType) &&
    hasValidGeometry(value.origin, value.landing, value.pitch, value.yaw) &&
    hasValidCommand(value.movementKeys, value.movementKeysSummary, value.command) &&
    hasValidInstructions(
      value.movementInstructions,
      value.imageUrls,
      value.imageCaptions,
      value.mouseButtons,
    ) &&
    hasValidOptionals(
      value.notes,
      value.mediaUrl,
      value.isBuiltIn,
      value.createdAt,
      (value as Record<string, unknown>).landingCommand,
      (value as Record<string, unknown>).fromDemo,
      (value as Record<string, unknown>).targetCallout,
      (value as Record<string, unknown>).waypoints,
      (value as Record<string, unknown>).groupId,
      (value as Record<string, unknown>).groupTarget,
    )
  );
}

/** Serializes a list of lineups into a versioned JSON envelope for file export. */
export function serializeLineupFile(lineups: readonly Lineup[]): string {
  const file: LineupFile = {
    version: 1,
    generator: 'disalytics',
    exportedAt: new Date().toISOString(),
    lineups,
  };

  return JSON.stringify(file, null, 2);
}

/** Parses and validates a JSON string as a `LineupFile`, returning its lineups. */
export function parseLineupFile(json: string): readonly Lineup[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (cause) {
    throw new LineupFileError(
      `Failed to parse lineup JSON: ${cause instanceof Error ? cause.message : 'syntax error'}`,
      'INVALID_JSON',
    );
  }

  if (!isObject(parsed)) {
    throw new LineupFileError('Root of lineup file must be an object', 'INVALID_SCHEMA');
  }

  if (parsed.version !== 1 || parsed.generator !== 'disalytics') {
    throw new LineupFileError(
      `Unsupported lineup file format (expected generator 'disalytics' version 1, got generator '${String(
        parsed.generator,
      )}' version '${String(parsed.version)}')`,
      'UNSUPPORTED_VERSION',
    );
  }

  if (!Array.isArray(parsed.lineups)) {
    throw new LineupFileError('Field "lineups" must be an array', 'INVALID_SCHEMA');
  }

  const validLineups: Lineup[] = [];
  for (let i = 0; i < parsed.lineups.length; i++) {
    const item = parsed.lineups[i];
    if (!isLineup(item)) {
      throw new LineupFileError(`Invalid lineup entry at index ${i}`, 'INVALID_SCHEMA');
    }
    validLineups.push(item);
  }

  return validLineups;
}
