import type { ParsedDemo, PlayerSlot, Team, WorldPoint } from '../schema';
import { type MovementKey, type ThrowDetail, type ThrowType, throwDetail } from './throw-detail';
import { type UtilityKind, utilityKindOfGrenade } from './utility';
import { matchUtility, type UtilityThrow } from './utility-throws';

/**
 * Two throws are one *variant* when they were thrown from the same spot: a thrower's feet drift a
 * step between attempts at 16 Hz sampling, and a lineup is repeated by standing on a pixel of a
 * wall or a crate, which is well inside this.
 */
export const VARIANT_ORIGIN_UNITS = 110;

/** And they must land together: a smoke's cloud is 144 units wide, so a landing inside it is the same cloud. */
export const VARIANT_LANDING_UNITS = 150;

/**
 * Variants are one *target* when they land within this of each other: a reader names a place by
 * where the cloud ends up, and two clouds that overlap by half are the same place to them.
 */
export const TARGET_LANDING_UNITS = 200;

export type LineupVariantSide = Team | 'BOTH';

export interface LineupVariantThrow {
  readonly thrown: UtilityThrow;
  readonly detail: ThrowDetail;
}

/** One way of throwing at a target: the same kind from one spot, repeated. */
export interface LineupVariant {
  /** Stable for a demo, and the identity a saved lineup is keyed on. */
  readonly id: string;
  readonly kind: UtilityKind;
  readonly side: LineupVariantSide;
  /** The throw nearest the middle of the group, which is the one whose command is offered. */
  readonly representative: LineupVariantThrow;
  readonly origin: WorldPoint;
  readonly landing: WorldPoint;
  readonly throwType: ThrowType;
  readonly movementKeys: readonly MovementKey[];
  readonly command: string;
  /** Oldest first. */
  readonly throws: readonly LineupVariantThrow[];
  readonly players: readonly PlayerSlot[];
  readonly roundIndexes: readonly number[];
}

/** Where a grenade of one kind landed, with every way it was thrown there, most used first. */
export interface LineupTarget {
  readonly id: string;
  readonly kind: UtilityKind;
  readonly side: LineupVariantSide;
  readonly landing: WorldPoint;
  readonly variants: readonly LineupVariant[];
  readonly throwCount: number;
}

export interface MatchLineups {
  /** Most thrown first, and the order is total, so it is the same for the same demo. */
  readonly targets: readonly LineupTarget[];
  /** Throws taken on the move: they cannot be repeated from a spot, so they are dots, not lineups. */
  readonly onTheMove: readonly UtilityThrow[];
}

/** Two storeys of a map are further apart than this, and the two sides of a step are not. */
const SAME_FLOOR_UNITS = 450;

/** Ground distance, or infinity between floors: a smoke on nuke's roof is not one in its vent. */
function distance(a: WorldPoint, b: WorldPoint): number {
  return Math.abs(a.z - b.z) > SAME_FLOOR_UNITS
    ? Number.POSITIVE_INFINITY
    : Math.hypot(a.x - b.x, a.y - b.y);
}

function sideOf(throwers: readonly (Team | undefined)[]): LineupVariantSide {
  const first = throwers[0];
  return first !== undefined && throwers.every((side) => side === first) ? first : 'BOTH';
}

function nearestToCentre(
  throws: readonly LineupVariantThrow[],
  key: (item: LineupVariantThrow) => WorldPoint,
): LineupVariantThrow {
  const centre = { x: 0, y: 0, z: 0 };
  for (const item of throws) {
    const point = key(item);
    centre.x += point.x / throws.length;
    centre.y += point.y / throws.length;
    centre.z += point.z / throws.length;
  }

  let best = throws[0];
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const item of throws) {
    const away = distance(key(item), centre);
    if (away < bestDistance) {
      bestDistance = away;
      best = item;
    }
  }

  if (best === undefined) throw new Error('a variant has at least one throw');
  return best;
}

function variantOf(kind: UtilityKind, throws: readonly LineupVariantThrow[]): LineupVariant {
  const representative = nearestToCentre(throws, (item) => item.detail.playerPos);
  const { detail } = representative;

  return {
    id: `${kind}:${Math.round(detail.playerPos.x)}:${Math.round(detail.playerPos.y)}:${Math.round(detail.landing.x)}:${Math.round(detail.landing.y)}`,
    kind,
    side: sideOf(throws.map((item) => item.thrown.throwerSide)),
    representative,
    origin: detail.playerPos,
    landing: nearestToCentre(throws, (item) => item.detail.landing).detail.landing,
    throwType: detail.throwType,
    movementKeys: detail.movementKeys,
    command: detail.command,
    throws,
    players: [...new Set(throws.map((item) => item.thrown.grenade.thrower))],
    roundIndexes: [...new Set(throws.map((item) => item.thrown.roundIndex))],
  };
}

function groupVariants(
  kind: UtilityKind,
  throws: readonly LineupVariantThrow[],
): readonly LineupVariant[] {
  const groups: { anchor: LineupVariantThrow; members: LineupVariantThrow[] }[] = [];

  for (const item of throws) {
    const group = groups.find(
      ({ anchor }) =>
        distance(anchor.detail.playerPos, item.detail.playerPos) <= VARIANT_ORIGIN_UNITS &&
        distance(anchor.detail.landing, item.detail.landing) <= VARIANT_LANDING_UNITS,
    );
    if (group === undefined) groups.push({ anchor: item, members: [item] });
    else group.members.push(item);
  }

  return groups.map(({ members }) => variantOf(kind, members));
}

function byThrowCount(a: { readonly throws: readonly unknown[] }, b: typeof a): number {
  return b.throws.length - a.throws.length;
}

function groupTargets(variants: readonly LineupVariant[]): readonly LineupTarget[] {
  const groups: { anchor: LineupVariant; members: LineupVariant[] }[] = [];

  for (const variant of [...variants].sort(byThrowCount)) {
    const group = groups.find(
      ({ anchor }) =>
        anchor.kind === variant.kind &&
        distance(anchor.landing, variant.landing) <= TARGET_LANDING_UNITS,
    );
    if (group === undefined) groups.push({ anchor: variant, members: [variant] });
    else group.members.push(variant);
  }

  return groups.map(({ anchor, members }) => ({
    id: `${anchor.kind}:${Math.round(anchor.landing.x)}:${Math.round(anchor.landing.y)}`,
    kind: anchor.kind,
    side: sideOf(members.map((variant) => (variant.side === 'BOTH' ? undefined : variant.side))),
    landing: anchor.landing,
    variants: members,
    throwCount: members.reduce((total, variant) => total + variant.throws.length, 0),
  }));
}

/**
 * The lineups a match threw: its grenades grouped by where they landed and where they were thrown
 * from, so a reader can ask "how do I get a smoke on Xbox" and be told.
 *
 * **A throw on the move is not a lineup.** It was thrown while running, from no spot a player can
 * stand on, so it cannot be repeated and is kept apart as a landing to draw. On the dust2 sample
 * that is 318 of the 522 throws.
 *
 * Grouping is greedy and runs in throw order, then in count order, so the same demo always yields
 * the same groups. It is derived once per demo: `throwDetail` scans the run-up of every throw.
 */
export function matchLineups(demo: ParsedDemo): MatchLineups {
  const byKind = new Map<UtilityKind, LineupVariantThrow[]>();
  const onTheMove: UtilityThrow[] = [];

  for (const thrown of matchUtility(demo)) {
    const detail = throwDetail(demo, thrown);
    if (detail.throwType === 'run') {
      onTheMove.push(thrown);
      continue;
    }

    const kind = utilityKindOfGrenade(thrown.grenade.type);
    const own = byKind.get(kind) ?? [];
    own.push({ thrown, detail });
    byKind.set(kind, own);
  }

  const variants = [...byKind].flatMap(([kind, own]) => groupVariants(kind, own));
  const targets = [...groupTargets(variants)].sort(
    (a, b) => b.throwCount - a.throwCount || a.id.localeCompare(b.id),
  );

  return { targets, onTheMove };
}
