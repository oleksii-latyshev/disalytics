import { readCssToken } from '@/shared/lib';
import { WEAPON_MARK_PX } from './equipment-marks';
import type { PlateBounds } from './view';

/*
 * The label's own measure: every size a name on the plate is set at, the boxes those sizes make,
 * and the two functions that read a box rather than draw into one.
 *
 * It exists so the two passes that place labels — the name and the hit's figure — can each depend
 * on the metrics without depending on each other. #322 found that seam and declined to take it,
 * because `placeDamage` needed `isOnPlate`, `LABEL_HALO_PX` and `LABEL_HEIGHT_PX`, all of which
 * lived in the file that would have imported it; moving them here is what opens it, and it is the
 * shape #261 used when `weapons.ts` split.
 */

/**
 * The size a name is set at on the plate, and it is §3's scale rather than a number of its own: the
 * same size §5.3's team row sets the same name at, so one nickname is one size wherever the screen
 * says it.
 *
 * It was 10 until this, chosen against a condensed face the product no longer has, and 10 is the
 * step §3 opens up the most because it is the step meant for a label nobody reads twice. A name
 * beside a moving token is read at a glance from a normal viewing distance, which is the opposite
 * demand, and at 10px the owner could not tell one player from another without zooming the browser.
 *
 * §3 attaches optical tracking to each step and this canvas applies none, which is worth stating so
 * the next reader does not have to work out whether it was forgotten: it was measured and left
 * alone. The step asks for 0.005em here, which is 0.065px a character — 0.9px across the longest
 * name this draws, and below the pixel the canvas would place it on. At the 10px this replaces the
 * same rule asked for four times as much, so the size that needs the tracking least is the one the
 * plate now sets.
 */
export const LABEL_SIZE_PX = 13;

/**
 * How far the halo reaches past the glyphs. It is ink like the text is, so the box the placer keeps
 * clear of its neighbours includes it — DESIGN.md §6.1 replaced the chip with this.
 *
 * **It stays 2 while the type grows**, and that is a decision rather than an oversight. The halo is
 * a device for holding a glyph off a bright plate pixel, not a proportion of the type: a 4px stroke
 * laid under 10px text was already close to closing the counters in `e` and `o`, and the same
 * stroke under 13px text leaves them further open. Scaling it with the size would have taken back
 * some of the legibility the size was raised for.
 */
export const LABEL_HALO_PX = 2;
export const LABEL_HEIGHT_PX = LABEL_SIZE_PX + 2 * LABEL_HALO_PX;

/**
 * Between the weapon mark and the name it leads, tight enough that the two read as one label — and
 * it stays 3px while the type grows, because what closes it into one shape is the halo rather than
 * the proportion: a 2px stroke reaches 2px from each side, and a gap it can cover at 10px it covers
 * at 13px.
 */
const WEAPON_GAP_PX = 3;

/**
 * The mark's box is reserved for every named slot, whether or not a mark goes in it. A width that
 * followed the weapon would move the name sideways every time its player switched, and would change
 * which labels collide from one frame to the next — the placer is allowed to depend on the frame,
 * but a reader should not have to watch a name twitch to learn that somebody drew a knife.
 */
export const WEAPON_BOX_PX = WEAPON_MARK_PX + WEAPON_GAP_PX;

export interface LabelStyle {
  readonly font: string;
  /** One rank down for the round's numbers, so the name stays the label's first reading. */
  readonly detailFont: string;
  /**
   * The hit's figure. The mono face because every number in the product is tabular, and the round's
   * own size rather than the name's — one rank down §3's scale, so the name beside it stays the
   * label's first reading. It resolves to the same string as `detailFont` today and is named
   * separately because the two would be changed for different reasons: that one is a line under a
   * name, this one is a mark of its own beside a token.
   */
  readonly damageFont: string;
}

/**
 * The detail is set in the mono face, because every number in the product is tabular, and one rank
 * down §3's scale from the name so that the name is still what the label reads as.
 */
const DETAIL_SIZE_PX = 12;

/** How far the round's line sits under the name it belongs to — the name's own size. */
export const DETAIL_LEAD_PX = LABEL_SIZE_PX;

export function readLabelStyle(): LabelStyle {
  return {
    font: `${LABEL_SIZE_PX}px ${readCssToken('--font-ui')}`,
    detailFont: `${DETAIL_SIZE_PX}px ${readCssToken('--font-mono')}`,
    damageFont: `${DETAIL_SIZE_PX}px ${readCssToken('--font-mono')}`,
  };
}

/**
 * The halo the label and its weapon mark share — a stroke laid under the glyphs rather than a box
 * behind them. Both callers take it from here, so §10.6's legend cannot draw a lighter or heavier
 * halo than the plate does.
 */
export function haloStroke(context: CanvasRenderingContext2D, halo: string): void {
  context.lineWidth = 2 * LABEL_HALO_PX;
  context.lineJoin = 'round';
  context.strokeStyle = halo;
}

/** Whether a token is inside the rectangle the reader is actually looking at. */
export function isOnPlate(x: number, y: number, bounds: PlateBounds): boolean {
  return (
    x >= bounds.left &&
    x <= bounds.left + bounds.width &&
    y >= bounds.top &&
    y <= bounds.top + bounds.height
  );
}
