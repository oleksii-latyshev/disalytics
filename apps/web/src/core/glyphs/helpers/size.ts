/**
 * The two sizes the product's own glyph set is drawn at, both on the 4px grid.
 *
 * `row` is a glyph beside text — a team row's weapon and utility (§5.3), where 12px is the size the
 * line gives it. `axis` is §7.1's round timeline, which is the one timeline in the product with room
 * for symbols, and 12px there was a mark pretending to be one.
 */
export type GlyphSize = 'row' | 'axis';

export const GLYPH_SIZE_CLASS: Readonly<Record<GlyphSize, string>> = {
  row: 'size-3',
  axis: 'size-6',
};
