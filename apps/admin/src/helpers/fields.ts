import { type Lineup, looseLineup } from '@disa/demo-core';

export const FIELD_IDS = [
  'title',
  'callout',
  'kind',
  'side',
  'throwType',
  'movement',
  'movementInstructions',
  'mouseButtons',
  'notes',
  'tags',
  'author',
  'origin',
  'landing',
  'waypoints',
  'aim',
  'command',
  'landingCommand',
  'mediaUrl',
  'groups',
] as const;

export type FieldId = (typeof FIELD_IDS)[number];

export type Side = 'stored' | 'file';
export type Picks = Readonly<Record<FieldId, Side>>;

/** What a person compares and chooses between when two versions of a lineup are merged. */
const FIELD_KEYS: Readonly<Record<FieldId, readonly (keyof Lineup)[]>> = {
  title: ['title'],
  callout: ['targetCallout'],
  kind: ['kind'],
  side: ['side'],
  throwType: ['throwType'],
  movement: ['movementKeys', 'movementKeysSummary'],
  movementInstructions: ['movementInstructions'],
  mouseButtons: ['mouseButtons'],
  notes: ['notes'],
  tags: ['tags'],
  author: ['author'],
  origin: ['origin'],
  landing: ['landing'],
  waypoints: ['waypoints'],
  aim: ['pitch', 'yaw'],
  command: ['command'],
  landingCommand: ['landingCommand'],
  mediaUrl: ['mediaUrl'],
  groups: ['groupId', 'originGroupId'],
};

function picksBy(choose: (id: FieldId) => Side): Picks {
  return {
    title: choose('title'),
    callout: choose('callout'),
    kind: choose('kind'),
    side: choose('side'),
    throwType: choose('throwType'),
    movement: choose('movement'),
    movementInstructions: choose('movementInstructions'),
    mouseButtons: choose('mouseButtons'),
    notes: choose('notes'),
    tags: choose('tags'),
    author: choose('author'),
    origin: choose('origin'),
    landing: choose('landing'),
    waypoints: choose('waypoints'),
    aim: choose('aim'),
    command: choose('command'),
    landingCommand: choose('landingCommand'),
    mediaUrl: choose('mediaUrl'),
    groups: choose('groups'),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (!isRecord(value)) return JSON.stringify(value) ?? 'null';
  const keys = Object.keys(value)
    .filter((key) => value[key] !== undefined)
    .sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
}

function fieldValue(lineup: Lineup, key: keyof Lineup): unknown {
  return lineup[key];
}

/** Whether a field holds nothing: unset, blank text, an empty list. */
export function isEmptyField(id: FieldId, lineup: Lineup): boolean {
  return FIELD_KEYS[id].every((key) => {
    const value = fieldValue(lineup, key);
    if (value === undefined || value === null) return true;
    if (typeof value === 'string') return value.trim() === '';
    return Array.isArray(value) && value.length === 0;
  });
}

/** Whether the two lineups hold the same value in this field. */
export function sameField(id: FieldId, a: Lineup, b: Lineup): boolean {
  return FIELD_KEYS[id].every((key) => stable(fieldValue(a, key)) === stable(fieldValue(b, key)));
}

/**
 * Where each field starts: the file's value, unless it is empty and the site has one. A field both
 * sides agree on reads the same either way.
 */
export function defaultPicks(stored: Lineup, file: Lineup): Picks {
  return picksBy((id) =>
    !sameField(id, stored, file) && isEmptyField(id, file) ? 'stored' : 'file',
  );
}

export function allPicks(side: Side): Picks {
  return picksBy(() => side);
}

/**
 * The lineup with each field taken from the side picked for it. The id, creation time and photos
 * are the site's; photos are settled separately.
 */
export function mergeFields(stored: Lineup, file: Lineup, picks: Picks): Lineup {
  const merged: Record<string, unknown> = { ...stored };
  for (const id of FIELD_IDS) {
    const source = picks[id] === 'file' ? file : stored;
    for (const key of FIELD_KEYS[id]) {
      const value = fieldValue(source, key);
      if (value === undefined) delete merged[key];
      else merged[key] = value;
    }
  }
  return looseLineup(merged) ?? stored;
}

/** `target` with the listed fields set to what `source` has; a field `source` lacks is removed. */
export function copyFields(target: Lineup, source: Lineup, fields: readonly FieldId[]): Lineup {
  const copy: Record<string, unknown> = { ...target };
  for (const id of fields) {
    for (const key of FIELD_KEYS[id]) {
      const value = fieldValue(source, key);
      if (value === undefined) delete copy[key];
      else copy[key] = value;
    }
  }
  return looseLineup(copy) ?? target;
}

/** The fields in which the two versions differ. */
export function differingFields(a: Lineup, b: Lineup): FieldId[] {
  return FIELD_IDS.filter((id) => !sameField(id, a, b));
}
