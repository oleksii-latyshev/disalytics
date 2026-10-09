/**
 * The three sizes the product's own glyph set is drawn at, all on the 4px grid.
 *
 * `row` is a glyph beside text — a team row's weapon and utility (§5.3), where 12px is the size the
 * line gives it. `axis` is §7.1's round timeline, which is the one timeline in the product with room
 * for symbols, and 12px there was a mark pretending to be one.
 *
 * `control` is a mark *inside* a control rather than in the reading: the axis filter names a facet
 * with the shape the axis draws it as. 16px is not a fourth drawing scale — it is `Button`'s own
 * icon size, the one every lucide icon in a 32px control already takes, so a product glyph and a
 * library icon standing in the same row are the same size.
 */
export type GlyphSize = 'row' | 'axis' | 'control';

export const GLYPH_SIZE_CLASS: Readonly<Record<GlyphSize, string>> = {
  row: 'size-3',
  control: 'size-4',
  axis: 'size-6',
};
