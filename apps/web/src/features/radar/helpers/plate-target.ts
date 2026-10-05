import type { UtilityKind, WorldPoint } from '@disa/demo-core';

/** Where one way of throwing at a target starts. */
export interface PlateOrigin {
  readonly id: string;
  readonly origin: WorldPoint;
}

/**
 * What a plate's markers need of a target — where a grenade of one kind lands, and every spot it is
 * thrown from. A match's `LineupTarget` is one and a reader's saved lineups grouped by where they
 * land are another, which is why the markers ask for this and not for either.
 */
export interface PlateTarget {
  readonly id: string;
  readonly kind: UtilityKind;
  readonly landing: WorldPoint;
  /** How many times it was thrown, or how many positions are saved: the count on its marker. */
  readonly throwCount: number;
  readonly variants: readonly PlateOrigin[];
}

/** A position on the plate, in radar pixels of the layout. */
export interface PlatePoint {
  readonly x: number;
  readonly y: number;
}
