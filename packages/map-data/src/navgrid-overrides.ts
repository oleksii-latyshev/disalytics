import type { MapId } from './generated/overviews';

/** A rectangle in the radar image's own pixels, `x`/`y` at its upper-left corner. */
export interface NavRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Hand corrections to what `navgrid:generate` traces off the radar, per level (`MapOverview.levels`
 * order). A cell whose centre falls inside an `open` rectangle becomes walkable, inside a `close`
 * rectangle blocked; `open` is applied first. They are baked in at generation, so changing this
 * file means regenerating — `navgrid:generate` is the only reader.
 */
export interface NavOverride {
  readonly level: number;
  readonly note: string;
  readonly open?: readonly NavRect[];
  readonly close?: readonly NavRect[];
}

export const NAV_OVERRIDES: Readonly<Partial<Record<MapId, readonly NavOverride[]>>> = {};
