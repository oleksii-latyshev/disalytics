import { type AxisGlyph, GLYPH_PITCH_PX } from './round-axis';

/**
 * How far past its own mark an uncrowded glyph may be pressed — half the 24px symbol plus the 4px of
 * overrun the axis has always given it, so a glyph with room keeps exactly the target it had.
 */
export const GLYPH_HIT_HALF_PX = GLYPH_PITCH_PX / 2 + 4;

/**
 * The narrowest a target may get. Hit testing works in whole pixels — Blink rounds the point and
 * snaps the box — so a slot thinner than one of them is a glyph the pointer cannot address at all,
 * and a mark with no target is worse than two marks sharing a pixel.
 */
export const GLYPH_HIT_FLOOR_PX = 0.5;

/**
 * How far either side of its own mark each glyph may be pressed, in CSS pixels — DESIGN.md §7.1.
 *
 * A glyph sits where its event happened and is never nudged for room, so a cluster draws its marks
 * on top of each other. The *target* may not overlap: each one is capped at half the distance to its
 * nearest neighbour, which tiles the axis and puts every glyph's own centre inside its own box —
 * down to the floor, below which the pointer has run out of resolution and the arrow keys are what
 * reach the second of two events (#268).
 *
 * `glyphs` is in axis order — `axisGlyphs` sorts by frame — so a glyph's neighbours are its
 * neighbours in the array.
 */
export function glyphHitHalves(glyphs: readonly AxisGlyph[], widthPx: number): readonly number[] {
  if (widthPx <= 0) return glyphs.map(() => GLYPH_HIT_HALF_PX);

  return glyphs.map((glyph, index) => {
    const centre = glyph.fraction * widthPx;
    // `.at(-1)` is the last glyph rather than nothing, which would give the first one the whole axis.
    const previous = index === 0 ? undefined : glyphs.at(index - 1);
    const next = glyphs.at(index + 1);

    let half = GLYPH_HIT_HALF_PX;
    if (previous !== undefined) half = Math.min(half, (centre - previous.fraction * widthPx) / 2);
    if (next !== undefined) half = Math.min(half, (next.fraction * widthPx - centre) / 2);

    return Math.max(half, GLYPH_HIT_FLOOR_PX);
  });
}
