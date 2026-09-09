import type { RadarColors } from './colors';
import type { LabelStyle } from './label-box';

/**
 * The swatch's own box, the places in it more than one family of mark stands, and what a mark is.
 *
 * It is a module of its own because both mark lists read it and `plate-legend` reads them: a
 * constant or a type left in either list would close a cycle the moment the other needed it.
 */

/**
 * The swatch every mark is drawn in, in CSS pixels. Wide enough for two tokens with their needles
 * and tall enough for the largest ring a token carries, which is what fixes the number: the marks
 * are drawn at the size the plate draws them, not at a size chosen to fill the box.
 */
export const MARK_WIDTH_PX = 56;
export const MARK_HEIGHT_PX = 28;

export const CENTRE_X = MARK_WIDTH_PX / 2;
export const CENTRE_Y = MARK_HEIGHT_PX / 2;

/** The pair the `player` mark draws, far enough apart that neither needle reaches the other. */
export const LEFT_X = 14;
export const RIGHT_X = 42;

/** Part-way through, so a mark that counts something down is shown counting rather than full. */
export const PART_WAY = 0.6;

export type PlateMarkId =
  | 'player'
  | 'weapon'
  | 'leader'
  | 'walking'
  | 'firing'
  | 'selected'
  | 'hit'
  | 'blinded'
  | 'objective'
  | 'dead'
  | 'audible'
  | 'trajectory'
  | 'he'
  | 'flash'
  | 'smoke'
  | 'fire'
  | 'decoy'
  | 'kill';

export interface PlateMark {
  readonly id: PlateMarkId;
  /**
   * What the mark is called where it has a name of its own. Game vocabulary, so it arrives from
   * `demo-core` untranslated — `AGENTS.md` §11.
   */
  readonly vocabulary?: string;
  /**
   * The style arrives with the colours rather than being read here, for the reason the colours do:
   * the caller resolves the document once, outside the paint, and a mark that draws no text ignores
   * it.
   */
  readonly draw: (
    context: CanvasRenderingContext2D,
    colors: RadarColors,
    style: LabelStyle,
  ) => void;
}
