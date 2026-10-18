import type { MapId } from './generated/overviews';

/**
 * One radar image for one slab of the map. Single-level maps have exactly one, spanning the whole
 * world; Nuke and Vertigo split at the altitude Valve records in `verticalsections`.
 */
export interface RadarLevel {
  /** Asset stem — the file is `radar/<theme>/<image>.png`. */
  readonly image: string;
  readonly altitudeMax: number;
  readonly altitudeMin: number;
}

/**
 * Valve's own overview definition, as extracted from `resource/overviews/<map>.txt`. `posX` / `posY`
 * are the world coordinate of the image's upper-left corner and `scale` is world units per pixel.
 */
export interface MapOverview {
  readonly id: MapId;
  readonly posX: number;
  readonly posY: number;
  readonly scale: number;
  readonly rotate: number;
  readonly zoom: number;
  /** Ordered; the first entry is the map's default level. */
  readonly levels: readonly [RadarLevel, ...RadarLevel[]];
}

/** A position in radar-image pixels, origin at the image's upper-left corner. */
export interface RadarPoint {
  readonly x: number;
  readonly y: number;
}

/** A position on the world's ground plane, in world units. Altitude is the caller's business. */
export interface WorldPlanePoint {
  readonly x: number;
  readonly y: number;
}

/** Where one level's image lands on the plate, and which part of the image is kept. */
export interface PlateSlot {
  /** The kept rectangle of the level's image, in image pixels. */
  readonly cropX: number;
  readonly cropY: number;
  readonly width: number;
  readonly height: number;
  /** Where the kept rectangle's upper-left corner sits on the plate, in radar pixels. */
  readonly x: number;
  readonly y: number;
  /** Which floor to name on the plate, or `null` when the map has only one. */
  readonly floor: 'upper' | 'lower' | null;
}

/**
 * The composite a map is drawn on. `slots` follow `MapOverview.levels` one for one; a single-level
 * map's plate is its image as it is.
 */
export interface PlateLayout {
  readonly width: number;
  readonly height: number;
  readonly slots: readonly [PlateSlot, ...PlateSlot[]];
}

/**
 * What `navgrid:generate` commits for one map: the floor traced off each level's radar image, one
 * bit per cell (row-major, most significant bit first), base64. Level order is
 * `MapOverview.levels`; every grid is `size` x `size` cells of `cell` radar pixels.
 */
export interface NavGridData {
  readonly cell: number;
  readonly size: number;
  readonly levels: readonly string[];
  /** Where floors join; absent on a map with one floor. */
  readonly connectors?: readonly NavConnector[] | undefined;
}

/**
 * What `floors:generate` commits for one map. `masks` holds, for each authored extra floor, the
 * cells its tracks cover (`own`) and the cells the floor it shares pixels with covers in the same
 * region (`shared`), packed like `NavGridData.levels`.
 */
export interface MapFloorData {
  readonly connectors: readonly NavConnector[];
  readonly masks?:
    | Readonly<Record<string, { readonly own: string; readonly shared: string }>>
    | undefined;
}

/** A spot on one floor, in radar pixels. */
export interface FloorPoint extends RadarPoint {
  /** Position in `mapFloors`. */
  readonly floor: number;
}

/**
 * A place real players changed floor, read from their tracks: stand on `a`, arrive on `b`. A
 * connector seen in one direction only (a drop) is `isOneWay` and used from `a` to `b` alone.
 */
export interface NavConnector {
  readonly a: FloorPoint;
  readonly b: FloorPoint;
  readonly isOneWay?: boolean | undefined;
}

/** One level's walkable cells, unpacked to a byte each so the path-finder reads them directly. */
export interface NavLevel {
  readonly cell: number;
  readonly size: number;
  /** `size * size` bytes, 1 = walkable, index `y * size + x`. */
  readonly walkable: Uint8Array;
}

/** A map's walkable grids, one per floor (`mapFloors` order, the overview levels first). */
export interface NavGrid {
  readonly map: string;
  readonly levels: readonly NavLevel[];
  readonly connectors: readonly NavConnector[];
}

/**
 * A route between two points. `points` start at the (snapped) origin and end at the (snapped)
 * destination, so a drawn route never starts inside a wall. When `reachable` is false the two ends
 * share no walkable ground — a straight two-point segment, which the caller should mark as such.
 */
export interface NavPath {
  readonly points: readonly RadarPoint[];
  readonly reachable: boolean;
}
