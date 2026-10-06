import { type GrenadeType, grenadeRadiusUnits, type UtilityKind } from '@disa/demo-core';
import type { MapOverview } from '@disa/map-data';
import type { PlatePoint } from '@/features/radar';
import type { SavedTarget } from './lineup-targets';
import { platePointOf } from './plate-point';

/** How far an arc bows off the straight line, as a share of its length — enough to read as thrown. */
const ARC_BOW = 0.18;

/** The smallest a landing ring is drawn, so a decoy, which covers nothing, still has one. */
const MIN_RING_PLATE_PX = 14;

const GRENADE_OF_KIND: Readonly<Partial<Record<UtilityKind, GrenadeType>>> = {
  smoke: 'smokegrenade',
  flash: 'flashbang',
  fire: 'molotov',
  he: 'hegrenade',
  decoy: 'decoy',
};

export interface OverlayArc {
  readonly id: string;
  readonly path: string;
  readonly isActive: boolean;
}

/** What the plate draws under its markers for the picked target, or for a lineup being added. */
export interface OverlayPlot {
  readonly kind: UtilityKind;
  readonly landing: PlatePoint | null;
  readonly radiusPlatePx: number;
  readonly arcs: readonly OverlayArc[];
}

function fixed(value: number): string {
  return value.toFixed(1);
}

/**
 * A thrown path through the points given: each leg is a quadratic bowed to one side, so a bounce is
 * a visible corner and a straight throw still reads as a throw.
 */
export function arcPath(points: readonly PlatePoint[]): string {
  const [first, ...rest] = points;
  if (first === undefined) return '';

  let path = `M${fixed(first.x)} ${fixed(first.y)}`;
  let from = first;

  for (const to of rest) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy) || 1;
    const bow = ARC_BOW * length;
    const cx = (from.x + to.x) / 2 - (dy / length) * bow;
    const cy = (from.y + to.y) / 2 + (dx / length) * bow;

    path += ` Q${fixed(cx)} ${fixed(cy)} ${fixed(to.x)} ${fixed(to.y)}`;
    from = to;
  }

  return path;
}

export function ringRadius(overview: MapOverview, kind: UtilityKind): number {
  const type = GRENADE_OF_KIND[kind];
  const units = type === undefined ? 0 : grenadeRadiusUnits(type);

  return Math.max(units / overview.scale, MIN_RING_PLATE_PX);
}

/** The ground the picked target covers and an arc from every position to it, the active one lit. */
export function targetOverlay(
  overview: MapOverview,
  target: SavedTarget,
  activeId: string | null,
): OverlayPlot {
  return {
    kind: target.kind,
    landing: platePointOf(overview, target.landing),
    radiusPlatePx: ringRadius(overview, target.kind),
    arcs: target.variants.map(({ id, lineup }) => ({
      id,
      path: arcPath([
        platePointOf(overview, lineup.origin),
        ...(lineup.waypoints ?? []).map((point) => platePointOf(overview, point)),
        platePointOf(overview, lineup.landing),
      ]),
      isActive: id === activeId,
    })),
  };
}

export interface DraftPlot {
  readonly kind: UtilityKind;
  readonly landing: PlatePoint | null;
  readonly origin: PlatePoint | null;
}

/** What has been placed so far of a lineup being added: its landing, and the throw once it has a spot. */
export function draftOverlay(overview: MapOverview, draft: DraftPlot): OverlayPlot {
  const { landing, origin } = draft;

  return {
    kind: draft.kind,
    landing,
    radiusPlatePx: ringRadius(overview, draft.kind),
    arcs:
      landing !== null && origin !== null
        ? [{ id: 'draft', path: arcPath([origin, landing]), isActive: true }]
        : [],
  };
}
