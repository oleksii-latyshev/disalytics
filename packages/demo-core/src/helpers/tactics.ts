import { isDrawingStroke, isFiniteNumber, isObject, isPoint, isTacticThrow } from './tactic-guards';
import { isTacticV1, migrateTacticV1 } from './tactics-v1';
import type { UtilityKind } from './utility';

export type TacticSide = 'CT' | 'T';

export const TACTIC_SIDES: readonly TacticSide[] = ['CT', 'T'] as const;

export type TacticRound = 'pistol' | 'eco' | 'force' | 'full';

export const TACTIC_ROUNDS: readonly TacticRound[] = ['pistol', 'eco', 'force', 'full'] as const;

/** The tactic file version, not the demo `SCHEMA_VERSION`. */
export const TACTIC_SCHEMA_VERSION = 2;

export function isTacticRound(value: unknown): value is TacticRound {
  return TACTIC_ROUNDS.some((round) => round === value);
}

export interface TacticPoint {
  readonly x: number;
  readonly y: number;
  readonly z?: number | undefined;
}

export interface TacticThrow {
  readonly id: string;
  readonly throwerSlot: number;
  readonly kind: UtilityKind;
  readonly from: TacticPoint;
  readonly to: TacticPoint;
  readonly releaseTime: number;
  readonly lineupId?: string | undefined;
  /** The teammate who buys this grenade and drops it to the thrower, when the thrower does not carry it. */
  readonly droppedBy?: number | undefined;
  readonly notes?: string | undefined;
}

export interface TacticDrawingStroke {
  readonly id: string;
  readonly color: string;
  readonly points: readonly TacticPoint[];
}

export type TacticRouteMode = 'points' | 'pen';

/**
 * Where a player goes in a step. It starts where they ended the previous step (their spawn on the
 * first). `points` are the clicked waypoints, or the pen stroke; the walked path is derived.
 */
export interface TacticRoute {
  readonly mode: TacticRouteMode;
  readonly points: readonly TacticPoint[];
}

export interface TacticStepPlayer {
  readonly slot: number;
  readonly route: TacticRoute;
  readonly task?: string | undefined;
  /** Seconds the player waits at the start of the step before leaving. */
  readonly delaySeconds?: number | undefined;
  readonly yaw?: number | undefined;
  readonly label?: string | undefined;
}

export type TacticEnemyRole = 'anchor' | 'awp' | 'rotator' | 'lurker';

export const TACTIC_ENEMY_ROLES: readonly TacticEnemyRole[] = [
  'anchor',
  'awp',
  'rotator',
  'lurker',
] as const;

export interface TacticEnemy {
  readonly id: string;
  readonly at: TacticPoint;
  readonly note?: string | undefined;
  readonly role?: TacticEnemyRole | undefined;
  readonly killedBy?: number | undefined;
  readonly isDead?: boolean | undefined;
}

export interface TacticStep {
  readonly id: string;
  readonly name: string;
  readonly idea?: string | undefined;
  /** Seconds since the round went live when the step is pinned; null means right after the previous step. */
  readonly startsAt: number | null;
  readonly players: readonly TacticStepPlayer[];
  readonly throws: readonly TacticThrow[];
  readonly enemies?: readonly TacticEnemy[] | undefined;
  readonly drawings?: readonly TacticDrawingStroke[] | undefined;
}

export interface TacticPlan {
  readonly id: string;
  /** The root plan's name, or what has to happen for a branch to apply — free text. */
  readonly condition: string;
  /** `null` for the one root plan. */
  readonly parentId: string | null;
  /** Index, in the parent's effective steps, of the step this plan branches after. Unused on the root. */
  readonly forkAfter: number;
  /** Player slot to the effective step index from which that player is dead in this plan. */
  readonly deaths: Readonly<Record<number, number>>;
  /** The steps after the fork; the steps before it are the parent's. */
  readonly steps: readonly TacticStep[];
}

export interface Tactic {
  readonly id: string;
  readonly title: string;
  readonly map: string;
  readonly side: TacticSide;
  readonly rounds?: readonly TacticRound[] | undefined;
  /** Where each slot starts the round, indexed by slot. */
  readonly spawns: readonly TacticPoint[];
  readonly plans: readonly TacticPlan[];
  /** The gun a slot buys, by `WEAPON_REFERENCES` name; a slot without one buys what it likes. */
  readonly weapons?: Readonly<Record<number, string>> | undefined;
  readonly author?: string | undefined;
  readonly description?: string | undefined;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface TacticFile {
  readonly version: 2;
  readonly generator: 'disalytics';
  readonly exportedAt: string;
  readonly tactics: readonly Tactic[];
}

/** How a reader fills what an older tactic never stored. */
export interface TacticReadOptions {
  /** The spawn spots of a side on a map, one per slot; absent entries fall back to the first step. */
  readonly spawnsFor?:
    | ((map: string, side: TacticSide) => readonly TacticPoint[] | null | undefined)
    | undefined;
}

export class TacticFileError extends Error {
  readonly code: 'INVALID_JSON' | 'UNSUPPORTED_VERSION' | 'INVALID_SCHEMA';

  constructor(message: string, code: 'INVALID_JSON' | 'UNSUPPORTED_VERSION' | 'INVALID_SCHEMA') {
    super(message);
    this.name = 'TacticFileError';
    this.code = code;
  }
}

function isRoute(value: unknown): value is TacticRoute {
  if (!isObject(value)) return false;
  if (value.mode !== 'points' && value.mode !== 'pen') return false;
  return Array.isArray(value.points) && value.points.every(isPoint);
}

function isStepPlayer(value: unknown): value is TacticStepPlayer {
  if (!isObject(value)) return false;
  if (!isFiniteNumber(value.slot) || !isRoute(value.route)) return false;
  if (value.task !== undefined && typeof value.task !== 'string') return false;
  if (value.delaySeconds !== undefined && !isFiniteNumber(value.delaySeconds)) return false;
  if (value.yaw !== undefined && !isFiniteNumber(value.yaw)) return false;
  return value.label === undefined || typeof value.label === 'string';
}

function isEnemy(value: unknown): value is TacticEnemy {
  if (!isObject(value)) return false;
  if (typeof value.id !== 'string' || !isPoint(value.at)) return false;
  if (value.note !== undefined && typeof value.note !== 'string') return false;
  if (value.role !== undefined && !TACTIC_ENEMY_ROLES.some((role) => role === value.role)) {
    return false;
  }
  if (value.killedBy !== undefined && !isFiniteNumber(value.killedBy)) return false;
  return value.isDead === undefined || typeof value.isDead === 'boolean';
}

function hasValidStepLists(value: Record<string, unknown>): boolean {
  if (!Array.isArray(value.players) || !value.players.every(isStepPlayer)) return false;
  if (!Array.isArray(value.throws) || !value.throws.every(isTacticThrow)) return false;
  if (
    value.enemies !== undefined &&
    !(Array.isArray(value.enemies) && value.enemies.every(isEnemy))
  ) {
    return false;
  }
  return (
    value.drawings === undefined ||
    (Array.isArray(value.drawings) && value.drawings.every(isDrawingStroke))
  );
}

function isTacticStep(value: unknown): value is TacticStep {
  if (!isObject(value)) return false;
  if (typeof value.id !== 'string' || typeof value.name !== 'string') return false;
  if (value.idea !== undefined && typeof value.idea !== 'string') return false;
  if (value.startsAt !== null && !isFiniteNumber(value.startsAt)) return false;
  return hasValidStepLists(value);
}

function isDeaths(value: unknown): value is Readonly<Record<number, number>> {
  if (!isObject(value)) return false;
  return Object.entries(value).every(
    ([slot, index]) =>
      Number.isInteger(Number(slot)) &&
      typeof index === 'number' &&
      Number.isInteger(index) &&
      index >= 0,
  );
}

function isPlan(value: unknown): value is TacticPlan {
  if (!isObject(value)) return false;
  if (typeof value.id !== 'string' || typeof value.condition !== 'string') return false;
  if (value.parentId !== null && typeof value.parentId !== 'string') return false;
  if (typeof value.forkAfter !== 'number' || !Number.isInteger(value.forkAfter)) return false;
  if (value.forkAfter < 0) return false;
  if (!isDeaths(value.deaths)) return false;
  return Array.isArray(value.steps) && value.steps.every(isTacticStep);
}

/** Exactly one root, unique ids, and every fork pointing at a step its parent really has. */
function isPlanTree(plans: readonly TacticPlan[]): boolean {
  if (plans.length === 0) return false;
  const byId = new Map(plans.map((plan) => [plan.id, plan]));
  if (byId.size !== plans.length) return false;
  if (plans.filter((plan) => plan.parentId === null).length !== 1) return false;

  const lengths = new Map<string, number>();
  const lengthOf = (plan: TacticPlan, trail: ReadonlySet<string>): number | null => {
    const known = lengths.get(plan.id);
    if (known !== undefined) return known;
    if (trail.has(plan.id)) return null;
    let length: number;
    if (plan.parentId === null) {
      length = plan.steps.length;
    } else {
      const parent = byId.get(plan.parentId);
      if (parent === undefined) return null;
      const parentLength = lengthOf(parent, new Set([...trail, plan.id]));
      if (parentLength === null || plan.forkAfter >= parentLength) return null;
      length = plan.forkAfter + 1 + plan.steps.length;
    }
    lengths.set(plan.id, length);
    return length;
  };
  return plans.every((plan) => lengthOf(plan, new Set()) !== null);
}

function isWeapons(value: unknown): value is Readonly<Record<number, string>> {
  if (!isObject(value)) return false;
  return Object.entries(value).every(
    ([slot, weapon]) => Number.isInteger(Number(slot)) && typeof weapon === 'string',
  );
}

function hasValidOptionalFields(value: Record<string, unknown>): boolean {
  if (value.weapons !== undefined && !isWeapons(value.weapons)) return false;
  if (
    value.rounds !== undefined &&
    !(Array.isArray(value.rounds) && value.rounds.every(isTacticRound))
  ) {
    return false;
  }
  if (value.author !== undefined && typeof value.author !== 'string') {
    return false;
  }
  return value.description === undefined || typeof value.description === 'string';
}

/** A tactic of the current shape; older ones go through `readTactic`. */
export function isTactic(value: unknown): value is Tactic {
  if (!isObject(value)) return false;
  if (
    typeof value.id !== 'string' ||
    typeof value.title !== 'string' ||
    typeof value.map !== 'string'
  ) {
    return false;
  }
  if (value.side !== 'CT' && value.side !== 'T') return false;
  if (!Array.isArray(value.spawns) || !value.spawns.every(isPoint)) return false;
  if (!Array.isArray(value.plans) || !value.plans.every(isPlan) || !isPlanTree(value.plans)) {
    return false;
  }
  if (!hasValidOptionalFields(value)) return false;
  return isFiniteNumber(value.createdAt) && isFiniteNumber(value.updatedAt);
}

/** A tactic of any version, migrated to the current shape; null when it is neither. */
export function readTactic(value: unknown, options?: TacticReadOptions): Tactic | null {
  if (isTactic(value)) return value;
  if (isTacticV1(value)) return migrateTacticV1(value, options);
  return null;
}

export function serializeTacticFile(tactics: Tactic | readonly Tactic[]): string {
  const list = Array.isArray(tactics) ? tactics : [tactics];
  const file: TacticFile = {
    version: 2,
    generator: 'disalytics',
    exportedAt: new Date().toISOString(),
    tactics: list,
  };
  return JSON.stringify(file, null, 2);
}

export function parseTacticFile(json: string, options?: TacticReadOptions): readonly Tactic[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new TacticFileError('Invalid JSON format', 'INVALID_JSON');
  }

  if (!isObject(parsed)) {
    throw new TacticFileError('Expected an object at root', 'INVALID_SCHEMA');
  }

  if (parsed.version !== 1 && parsed.version !== 2) {
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

  const tactics: Tactic[] = [];
  for (const item of candidates) {
    const tactic = readTactic(item, options);
    if (tactic === null) {
      throw new TacticFileError('Invalid tactic object in file', 'INVALID_SCHEMA');
    }
    tactics.push(tactic);
  }
  return tactics;
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
 * Reads a tactic from a `#tactic=…` fragment of an old shared link, migrated to the current shape.
 * Returns null if invalid or corrupt. Links are no longer produced, but already-sent ones open.
 */
export function decodeTacticFromHash(
  hashOrUrl: string,
  options?: TacticReadOptions,
): Tactic | null {
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

    const parsed: unknown = JSON.parse(fromBase64Url(raw));
    return readTactic(parsed, options);
  } catch {
    return null;
  }
}
