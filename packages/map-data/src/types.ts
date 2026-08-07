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
