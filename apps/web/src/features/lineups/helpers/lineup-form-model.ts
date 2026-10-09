import {
  isHttpsUrl,
  isLocalImageRef,
  type LineupAuthor,
  type LineupMouseButton,
  type LineupSide,
  type LineupTag,
  type MovementKey,
  type ThrowType,
  type UtilityKind,
} from '@disa/demo-core';
import { findNearestCallout } from '@disa/map-data';

export function moved<T>(items: readonly T[], from: number, to: number): readonly T[] {
  if (to < 0 || to >= items.length || from === to) return items;
  const result = [...items];
  const [item] = result.splice(from, 1);
  if (item === undefined) return items;
  result.splice(to, 0, item);
  return result;
}

export function reorderLineupPhotos(
  values: LineupFormValues,
  from: number,
  to: number,
): LineupFormValues {
  return {
    ...values,
    imageUrls: moved(values.imageUrls, from, to),
    imageCaptions: moved(values.imageCaptions, from, to),
  };
}

export interface LineupFormData {
  readonly id?: string;
  readonly title?: string;
  readonly map?: string;
  readonly side?: LineupSide;
  readonly kind?: UtilityKind;
  readonly origin?: { readonly x: number; readonly y: number; readonly z?: number };
  readonly landing?: { readonly x: number; readonly y: number; readonly z?: number };
  readonly waypoints?:
    | readonly { readonly x: number; readonly y: number; readonly z?: number }[]
    | undefined;
  readonly groupId?: string | undefined;
  readonly originGroupId?: string | undefined;
  readonly pitch?: number;
  readonly yaw?: number;
  readonly throwType?: ThrowType;
  readonly movementKeys?: readonly MovementKey[];
  readonly mouseButtons?: readonly LineupMouseButton[];
  readonly movementInstructions?: string;
  readonly imageUrls?: readonly string[];
  readonly imageCaptions?: readonly string[];
  readonly command?: string;
  readonly landingCommand?: string;
  readonly fromDemo?: boolean;
  readonly notes?: string;
  readonly mediaUrl?: string;
  readonly targetCallout?: string;
  readonly tags?: readonly LineupTag[] | undefined;
  readonly author?: LineupAuthor | undefined;
  readonly createdAt?: number;
}

export interface LineupFormValues {
  readonly title: string;
  readonly map: string;
  readonly targetCallout: string;
  readonly side: LineupSide;
  readonly kind: UtilityKind;
  readonly throwType: ThrowType;
  readonly movementKeys: readonly MovementKey[];
  readonly mouseButtons: readonly LineupMouseButton[];
  readonly movementInstructions: string;
  readonly imageUrls: readonly string[];
  readonly imageCaptions: readonly string[];
  readonly originX: string;
  readonly originY: string;
  readonly originZ: string;
  readonly landingX: string;
  readonly landingY: string;
  readonly landingZ: string;
  readonly waypoints?:
    | readonly { readonly x: string; readonly y: string; readonly z: string }[]
    | undefined;
  readonly groupId?: string | undefined;
  readonly originGroupId?: string | undefined;
  readonly pitch: string;
  readonly yaw: string;
  readonly command: string;
  readonly landingCommand: string;
  readonly fromDemo: boolean;
  readonly notes: string;
  readonly mediaUrl: string;
  readonly tags: readonly LineupTag[];
  readonly authorName: string;
  readonly authorUrl: string;
}

function formatCoord(val?: number): string {
  return val !== undefined ? val.toFixed(2) : '0';
}

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function hasInvalidMediaUrl(values: LineupFormValues): boolean {
  return (
    (values.mediaUrl.trim().length > 0 && !isHttpUrl(values.mediaUrl.trim())) ||
    values.imageUrls.some((url) => !isHttpUrl(url) && !isLocalImageRef(url))
  );
}

export function basicValidationKey(
  values: LineupFormValues,
):
  | 'library.lineups.form.validation.titleRequired'
  | 'library.lineups.form.validation.mediaUrlInvalid'
  | 'library.lineups.form.validation.authorNameRequired'
  | 'library.lineups.form.validation.authorUrlInvalid'
  | null {
  if (!values.title.trim()) return 'library.lineups.form.validation.titleRequired';
  if (hasInvalidMediaUrl(values)) return 'library.lineups.form.validation.mediaUrlInvalid';
  const authorUrl = values.authorUrl.trim();
  if (authorUrl.length > 0 && !values.authorName.trim()) {
    return 'library.lineups.form.validation.authorNameRequired';
  }
  if (authorUrl.length > 0 && !isHttpsUrl(authorUrl)) {
    return 'library.lineups.form.validation.authorUrlInvalid';
  }
  return null;
}

function defaultFormValues(defaultMap: string): LineupFormValues {
  return {
    title: '',
    map: defaultMap,
    targetCallout: '',
    side: 'T',
    kind: 'smoke',
    throwType: 'jump',
    movementKeys: ['Jump'],
    mouseButtons: ['left'],
    movementInstructions: '',
    imageUrls: [],
    imageCaptions: [],
    originX: '0',
    originY: '0',
    originZ: '0',
    landingX: '0',
    landingY: '0',
    landingZ: '0',
    waypoints: [],
    pitch: '0',
    yaw: '0',
    command: '',
    landingCommand: '',
    fromDemo: false,
    notes: '',
    mediaUrl: '',
    tags: [],
    authorName: '',
    authorUrl: '',
  };
}

function resolveDemoLandingCommand(isFromDemo: boolean, data?: LineupFormData | null): string {
  if (!isFromDemo) return '';
  if (data?.landingCommand) return data.landingCommand;
  if (data?.landing?.z !== undefined) {
    return `setpos ${formatCoord(data.landing.x)} ${formatCoord(data.landing.y)} ${formatCoord(data.landing.z)}`;
  }
  return '';
}

function extractCoords(coord?: { readonly x: number; readonly y: number; readonly z?: number }) {
  return {
    x: formatCoord(coord?.x),
    y: formatCoord(coord?.y),
    z: formatCoord(coord?.z),
  };
}

function captionsOf(data: LineupFormData): readonly string[] {
  return data.imageUrls?.map((_, index) => data.imageCaptions?.[index] ?? '') ?? [];
}

function commandOf(data: LineupFormData, isFromDemo: boolean): string {
  return isFromDemo ? (data.command ?? '') : '';
}

export function autoDetectCallout(map: string, xStr: string, yStr: string): string | null {
  const lx = Number.parseFloat(xStr);
  const ly = Number.parseFloat(yStr);
  if (!Number.isFinite(lx) || !Number.isFinite(ly) || (lx === 0 && ly === 0)) {
    return null;
  }
  return findNearestCallout(map, { x: lx, y: ly });
}

function resolveInitialCallout(
  map: string,
  targetCallout?: string,
  landing?: { readonly x: string; readonly y: string },
): string {
  if (targetCallout) return targetCallout;
  if (!landing) return '';
  return autoDetectCallout(map, landing.x, landing.y) ?? '';
}

function tagsAndAuthorOf(data: LineupFormData) {
  return {
    tags: data.tags ?? [],
    authorName: data.author?.name ?? '',
    authorUrl: data.author?.url ?? '',
  };
}

export function initFormValues(
  data?: LineupFormData | null,
  defaultMap = 'de_mirage',
): LineupFormValues {
  if (!data) {
    return defaultFormValues(defaultMap);
  }

  const isFromDemo = Boolean(data.fromDemo || (data.command && data.command.trim().length > 0));
  const origin = extractCoords(data.origin);
  const landing = extractCoords(data.landing);
  const resolvedMap = data.map ?? defaultMap;

  return {
    title: data.title ?? '',
    map: resolvedMap,
    targetCallout: resolveInitialCallout(resolvedMap, data.targetCallout, landing),
    side: data.side ?? 'T',
    kind: data.kind ?? 'smoke',
    throwType: data.throwType ?? 'jump',
    movementKeys: data.movementKeys ?? ['Jump'],
    mouseButtons: data.mouseButtons ?? ['left'],
    movementInstructions: data.movementInstructions ?? '',
    imageUrls: data.imageUrls ?? [],
    imageCaptions: captionsOf(data),
    originX: origin.x,
    originY: origin.y,
    originZ: origin.z,
    landingX: landing.x,
    landingY: landing.y,
    landingZ: landing.z,
    waypoints: data.waypoints?.map((wp) => extractCoords(wp)) ?? [],
    groupId: data.groupId,
    originGroupId: data.originGroupId,
    pitch: formatCoord(data.pitch),
    yaw: formatCoord(data.yaw),
    command: commandOf(data, isFromDemo),
    landingCommand: resolveDemoLandingCommand(isFromDemo, data),
    fromDemo: isFromDemo,
    notes: data.notes ?? '',
    mediaUrl: data.mediaUrl ?? '',
    ...tagsAndAuthorOf(data),
  };
}
