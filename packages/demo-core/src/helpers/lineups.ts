import type { Team, WorldPoint } from '../schema';
import type { MovementKey, ThrowType } from './throw-detail';
import { isThrownUtilityKind, type UtilityKind } from './utility';

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

export const LINEUP_TAGS = ['meta', 'old'] as const;
export type LineupTag = (typeof LINEUP_TAGS)[number];

/** Tags that cannot sit on one lineup together. */
const EXCLUSIVE_TAGS: readonly (readonly [LineupTag, LineupTag])[] = [['meta', 'old']];

export interface LineupAuthor {
  readonly name: string;
  /** An `https://` link, shown as the author's name when present. */
  readonly url?: string | undefined;
}

export function isLineupTag(value: unknown): value is LineupTag {
  return typeof value === 'string' && LINEUP_TAGS.some((tag) => tag === value);
}

/** The tag set after switching `tag` on or off, dropping any tag it excludes. */
export function toggledLineupTag(tags: readonly LineupTag[], tag: LineupTag): readonly LineupTag[] {
  if (tags.includes(tag)) return tags.filter((item) => item !== tag);
  const rivals = EXCLUSIVE_TAGS.flatMap(([a, b]) => (a === tag ? [b] : b === tag ? [a] : []));
  return [...tags.filter((item) => !rivals.includes(item)), tag];
}

export function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

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
  /** The group sharing this lineup's landing node. */
  readonly groupId?: string | undefined;
  /** The group sharing this lineup's origin node; independent of `groupId`. */
  readonly originGroupId?: string | undefined;
  /** Legacy: older data put a lineup in one group of this kind. `normalizeLineup` folds it away. */
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
  readonly tags?: readonly LineupTag[] | undefined;
  readonly author?: LineupAuthor | undefined;
  readonly movementInstructions?: string;
  readonly mediaUrl?: string;
  readonly imageUrls?: readonly string[];
  readonly imageCaptions?: readonly string[];
  readonly isBuiltIn?: boolean;
  readonly createdAt: number;
}

/**
 * The lineup with its groups in the current shape: `groupId` is the landing group and
 * `originGroupId` the origin group. A legacy `groupTarget: 'origin'` lineup reads as
 * `originGroupId = groupId` with no landing group; `groupTarget` never survives.
 */
export function normalizeLineup(lineup: Lineup): Lineup {
  if (lineup.groupTarget === undefined) return lineup;

  const { groupTarget, groupId, originGroupId, ...rest } = lineup;
  if (groupTarget === 'origin') {
    const origin = originGroupId ?? groupId;
    return { ...rest, ...(origin === undefined ? {} : { originGroupId: origin }) };
  }

  return {
    ...rest,
    ...(groupId === undefined ? {} : { groupId }),
    ...(originGroupId === undefined ? {} : { originGroupId }),
  };
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

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (!isObject(value)) return value;
  const entries = Object.entries(value)
    .filter(([key, item]) => key !== 'isBuiltIn' && item !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, item]) => [key, canonical(item)]);
  return Object.fromEntries(entries);
}

/** Whether a stored lineup is an unchanged copy of a built-in: same id and content, any key order. */
export function isBuiltInCopy(lineup: Lineup, builtIns: readonly Lineup[]): boolean {
  const builtIn = builtIns.find((candidate) => candidate.id === lineup.id);
  return (
    builtIn !== undefined &&
    JSON.stringify(canonical(lineup)) === JSON.stringify(canonical(builtIn))
  );
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
    LINEUP_SIDES.some((candidate) => candidate === side) &&
    typeof kind === 'string' &&
    isThrownUtilityKind(kind) &&
    typeof throwType === 'string' &&
    THROW_TYPES.some((candidate) => candidate === throwType)
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

function isOptional(value: unknown, isValid: (present: unknown) => boolean): boolean {
  return value === undefined || isValid(value);
}

function isString(value: unknown): boolean {
  return typeof value === 'string';
}

function isBoolean(value: unknown): boolean {
  return typeof value === 'boolean';
}

function isNonBlankString(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function isWorldPointList(value: unknown): boolean {
  return Array.isArray(value) && value.every(isWorldPoint);
}

function isGroupTarget(value: unknown): boolean {
  return value === 'landing' || value === 'origin';
}

function isLineupTagList(value: unknown): boolean {
  if (!Array.isArray(value) || !value.every(isLineupTag)) return false;
  if (new Set(value).size !== value.length) return false;
  return EXCLUSIVE_TAGS.every(([a, b]) => !(value.includes(a) && value.includes(b)));
}

function isLineupAuthor(value: unknown): boolean {
  if (!isObject(value) || Array.isArray(value)) return false;
  return (
    isNonBlankString(value.name) &&
    isOptional(
      value.url,
      (url) => typeof url === 'string' && /^https:\/\/\S+$/.test(url) && isHttpsUrl(url),
    )
  );
}

function hasValidOptionals(value: Record<string, unknown>): boolean {
  return (
    isOptional(value.notes, isString) &&
    isOptional(value.mediaUrl, isString) &&
    isOptional(value.isBuiltIn, isBoolean) &&
    isOptional(value.createdAt, isFiniteNumber) &&
    isOptional(value.landingCommand, isString) &&
    isOptional(value.fromDemo, isBoolean) &&
    isOptional(value.targetCallout, isString) &&
    isOptional(value.waypoints, isWorldPointList) &&
    isOptional(value.groupId, isNonBlankString) &&
    isOptional(value.originGroupId, isNonBlankString) &&
    isOptional(value.groupTarget, isGroupTarget) &&
    isOptional(value.tags, isLineupTagList) &&
    isOptional(value.author, isLineupAuthor)
  );
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
    hasValidOptionals(value)
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
    validLineups.push(normalizeLineup(item));
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
