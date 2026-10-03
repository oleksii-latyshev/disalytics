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
  readonly version: 2;
  readonly generator: 'disalytics';
  readonly exportedAt: string;
  readonly lineups: readonly Lineup[];
  /** Lowercase hex SHA-256 of the photo bytes → `data:image/…;base64,…`. */
  readonly images: Readonly<Record<string, string>>;
}

export interface ParsedLineupFile {
  readonly lineups: readonly Lineup[];
  readonly images: Readonly<Record<string, string>>;
}

const LOCAL_IMAGE_PREFIX = 'local:';
const LOCAL_IMAGE_REF = /^local:([0-9a-f]{64})$/;
const IMAGE_HASH = /^[0-9a-f]{64}$/;
const IMAGE_DATA_URL = /^data:image\/(?:webp|png);base64,[A-Za-z0-9+/]+={0,2}$/;

/** True for an `imageUrls` entry that points at a photo kept on this device. */
export function isLocalImageRef(value: string): boolean {
  return LOCAL_IMAGE_REF.test(value);
}

/** The SHA-256 hex a `local:` reference names, or null for any other string. */
export function localImageHash(value: string): string | null {
  return LOCAL_IMAGE_REF.exec(value)?.[1] ?? null;
}

export function localImageRef(hash: string): string {
  return `${LOCAL_IMAGE_PREFIX}${hash}`;
}

/** Every distinct local photo hash the given lineups reference. */
export function referencedLocalImageHashes(lineups: readonly Lineup[]): ReadonlySet<string> {
  const hashes = new Set<string>();
  for (const lineup of lineups) {
    for (const url of lineup.imageUrls ?? []) {
      const hash = localImageHash(url);
      if (hash !== null) hashes.add(hash);
    }
  }
  return hashes;
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
  return (
    typeof value === 'string' && (/^https?:\/\/[^\s]+$/i.test(value) || isLocalImageRef(value))
  );
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

/**
 * Serializes lineups into a versioned JSON envelope. `images` maps a photo hash to its data URL;
 * only hashes the lineups reference are written.
 */
export function serializeLineupFile(
  lineups: readonly Lineup[],
  images: Readonly<Record<string, string>> = {},
): string {
  const referenced = referencedLocalImageHashes(lineups);
  const included: Record<string, string> = {};
  for (const hash of [...referenced].sort()) {
    const dataUrl = images[hash];
    if (dataUrl !== undefined) included[hash] = dataUrl;
  }

  const file: LineupFile = {
    version: 2,
    generator: 'disalytics',
    exportedAt: new Date().toISOString(),
    lineups,
    images: included,
  };

  return JSON.stringify(file, null, 2);
}

function parseImages(value: unknown): Record<string, string> {
  if (value === undefined) return {};
  if (!isObject(value) || Array.isArray(value)) {
    throw new LineupFileError('Field "images" must be an object', 'INVALID_SCHEMA');
  }
  const images: Record<string, string> = {};
  for (const [hash, dataUrl] of Object.entries(value)) {
    if (!IMAGE_HASH.test(hash)) {
      throw new LineupFileError(`Invalid image key "${hash}"`, 'INVALID_SCHEMA');
    }
    if (typeof dataUrl !== 'string' || !IMAGE_DATA_URL.test(dataUrl)) {
      throw new LineupFileError(`Invalid image data for "${hash}"`, 'INVALID_SCHEMA');
    }
    images[hash] = dataUrl;
  }
  return images;
}

/** Parses and validates a JSON string as a version 1 or 2 `LineupFile`. */
export function parseLineupFile(json: string): ParsedLineupFile {
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

  if ((parsed.version !== 1 && parsed.version !== 2) || parsed.generator !== 'disalytics') {
    throw new LineupFileError(
      `Unsupported lineup file format (expected generator 'disalytics' version 1 or 2, got generator '${String(
        parsed.generator,
      )}' version '${String(parsed.version)}')`,
      'UNSUPPORTED_VERSION',
    );
  }

  if (!Array.isArray(parsed.lineups)) {
    throw new LineupFileError('Field "lineups" must be an array', 'INVALID_SCHEMA');
  }

  const images = parsed.version === 2 ? parseImages(parsed.images) : {};

  const validLineups: Lineup[] = [];
  for (let i = 0; i < parsed.lineups.length; i++) {
    const item = parsed.lineups[i];
    if (!isLineup(item)) {
      throw new LineupFileError(`Invalid lineup entry at index ${i}`, 'INVALID_SCHEMA');
    }
    validLineups.push(item);
  }

  for (const hash of referencedLocalImageHashes(validLineups)) {
    if (!(hash in images)) {
      throw new LineupFileError(
        `Lineup references photo ${hash} that the file does not include`,
        'INVALID_SCHEMA',
      );
    }
  }

  return { lineups: validLineups, images };
}
