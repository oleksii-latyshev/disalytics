import type { PlayerSlot } from '@disa/demo-core';
import type { AxisEvent, AxisGlyph } from './round-axis';

/**
 * What the axis draws, grouped the way a reader asks about it rather than the way the schema
 * carries it: a plant and a defuse are one facet because they are one question — *what happened to
 * the bomb* — and because `EventGlyphs` already tints both with `--objective`, which is the same
 * grouping made in colour.
 */
export type AxisFacet = 'kills' | 'utility' | 'objectives';

/** In the order the control draws them, which is the order the axis is usually read in. */
export const AXIS_FACETS: readonly AxisFacet[] = ['kills', 'utility', 'objectives'];

export function facetOf(event: AxisEvent): AxisFacet {
  switch (event.kind) {
    case 'kill':
      return 'kills';
    case 'grenade':
      return 'utility';
    case 'plant':
    case 'defuse':
      return 'objectives';
  }
}

/**
 * Whether an event is one the given player *did*.
 *
 * A kill counts for its attacker and not for its victim, which is the rule `EventGlyphs` already
 * applies when it raises the selected player's marks: a kill *of* them is still someone else's
 * work. Making the two disagree would mean a glyph that rises under emphasis and disappears under
 * the filter, or the other way round.
 */
export function isBySubject(event: AxisEvent, subject: PlayerSlot): boolean {
  switch (event.kind) {
    case 'kill':
      return event.attacker === subject;
    case 'plant':
      return event.planter === subject;
    case 'defuse':
      return event.defuser === subject;
    case 'grenade':
      return event.thrower === subject;
  }
}

/**
 * What the reader has asked the axis to draw: some facets, optionally narrowed to one player.
 *
 * **This is `ROADMAP.md` M5's filter system seen from its first caller**, and it is deliberately
 * kept small and local. A filter there is facets plus a subject over several surfaces — a side, a
 * weapon, a round range — and the shape of *that* is what this row exists to find out. It lives in
 * `features/timeline` until a second surface has to obey the same filter; promoting it to `core/`
 * before then would be guessing at an interface with one caller to check it against.
 */
export interface AxisFilter {
  readonly facets: readonly AxisFacet[];
  /** `null` when the axis is not narrowed to anyone — which includes nobody being selected. */
  readonly subject: PlayerSlot | null;
}

/** Whether a filter would take anything away, and so whether it is worth walking the glyphs at all. */
function isOpen(filter: AxisFilter): boolean {
  return filter.subject === null && filter.facets.length === AXIS_FACETS.length;
}

/**
 * The glyphs the axis draws under a filter, in the order `axisGlyphs` put them in.
 *
 * It runs **before** `glyphHitHalves`, and that ordering is the whole mechanism rather than an
 * implementation detail: a slot is half the way to the nearest *drawn* mark, so taking a facet away
 * widens what is left, and #271's collapse hands those glyphs their symbols back. Nothing here
 * changes what a glyph looks like — the filter decides which events are on the axis, and the axis
 * decides what it has room to draw.
 *
 * An open filter returns the array it was given rather than a copy of it, so the memoised list a
 * `RoundTimeline` hands down keeps its identity for as long as the round does.
 */
export function filterGlyphs(
  glyphs: readonly AxisGlyph[],
  filter: AxisFilter,
): readonly AxisGlyph[] {
  if (isOpen(filter)) return glyphs;

  const { subject } = filter;

  return glyphs.filter(
    (glyph) =>
      filter.facets.includes(facetOf(glyph.event)) &&
      (subject === null || isBySubject(glyph.event, subject)),
  );
}
