import { asFrame, asPlayerSlot } from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import {
  AXIS_FACETS,
  type AxisFilter,
  facetOf,
  filterGlyphs,
  isBySubject,
} from '../helpers/axis-filter';
import { glyphHitHalves, hasRoomForSymbol } from '../helpers/glyph-hits';
import type { AxisEvent, AxisGlyph } from '../helpers/round-axis';

const ME = asPlayerSlot(3);
const THEM = asPlayerSlot(7);

const KILL: AxisEvent = {
  kind: 'kill',
  attacker: ME,
  victim: THEM,
  attackerSide: 'CT',
  victimSide: 'T',
  weapon: 'rifle',
  weaponIcon: 'ak47',
  weaponName: 'AK-47',
  isHeadshot: false,
  isWallbang: false,
  isThroughSmoke: false,
};
const PLANT: AxisEvent = { kind: 'plant', planter: THEM };
const DEFUSE: AxisEvent = { kind: 'defuse', defuser: ME, status: 'completed' };
const GRENADE: AxisEvent = { kind: 'grenade', thrower: THEM, utility: 'smoke' };

function glyph(event: AxisEvent, fraction: number): AxisGlyph {
  return { id: `${event.kind}-${fraction}`, frame: asFrame(0), fraction, event };
}

const OPEN: AxisFilter = { facets: AXIS_FACETS, subject: null };

describe('facetOf', () => {
  it('reads a plant and a defuse as one facet', () => {
    expect(facetOf(PLANT)).toBe('objectives');
    expect(facetOf(DEFUSE)).toBe('objectives');
  });

  it('separates the other two', () => {
    expect(facetOf(KILL)).toBe('kills');
    expect(facetOf(GRENADE)).toBe('utility');
  });
});

describe('isBySubject', () => {
  it('counts a kill for the attacker and not for the victim', () => {
    expect(isBySubject(KILL, ME)).toBe(true);
    expect(isBySubject(KILL, THEM)).toBe(false);
  });

  it('counts the objective and the throw for whoever did them', () => {
    expect(isBySubject(PLANT, THEM)).toBe(true);
    expect(isBySubject(DEFUSE, ME)).toBe(true);
    expect(isBySubject(GRENADE, THEM)).toBe(true);
    expect(isBySubject(GRENADE, ME)).toBe(false);
  });

  it('gives a world kill to nobody, since it has no attacker', () => {
    expect(isBySubject({ ...KILL, attacker: null }, ME)).toBe(false);
  });
});

describe('filterGlyphs', () => {
  const glyphs = [glyph(KILL, 0.1), glyph(GRENADE, 0.2), glyph(PLANT, 0.3), glyph(DEFUSE, 0.4)];

  it('hands back the very array it was given when nothing is filtered', () => {
    expect(filterGlyphs(glyphs, OPEN)).toBe(glyphs);
  });

  it('takes a facet away and leaves the rest in their order', () => {
    const shown = filterGlyphs(glyphs, { facets: ['kills', 'objectives'], subject: null });

    expect(shown.map((one) => one.event.kind)).toEqual(['kill', 'plant', 'defuse']);
  });

  it('narrows to one player across every facet at once', () => {
    const shown = filterGlyphs(glyphs, { facets: AXIS_FACETS, subject: ME });

    expect(shown.map((one) => one.event.kind)).toEqual(['kill', 'defuse']);
  });

  it('applies the facets and the subject together rather than either alone', () => {
    const shown = filterGlyphs(glyphs, { facets: ['objectives'], subject: ME });

    expect(shown.map((one) => one.event.kind)).toEqual(['defuse']);
  });

  it('empties the axis when every facet is off', () => {
    expect(filterGlyphs(glyphs, { facets: [], subject: null })).toHaveLength(0);
  });
});

describe('filtering and the collapse', () => {
  /**
   * The mechanism the whole row rests on: a hit slot is half the way to the nearest *drawn* mark, so
   * taking a facet away widens what is left and #271's collapse hands those glyphs their symbols
   * back. If this ever fails, the filter has stopped running before `glyphHitHalves`.
   */
  it('gives a crowded kill its symbol back once the utility around it goes', () => {
    const widthPx = 1000;
    // Four grenades within a glyph's width of the kill, which is exactly what collapses it.
    const crowded = [
      glyph(GRENADE, 0.49),
      glyph(GRENADE, 0.495),
      glyph(KILL, 0.5),
      glyph(GRENADE, 0.505),
      glyph(GRENADE, 0.51),
    ];

    const before = glyphHitHalves(crowded, widthPx);
    expect(hasRoomForSymbol(before.at(2) ?? 0)).toBe(false);

    const after = glyphHitHalves(
      filterGlyphs(crowded, { facets: ['kills', 'objectives'], subject: null }),
      widthPx,
    );
    expect(after).toHaveLength(1);
    expect(hasRoomForSymbol(after.at(0) ?? 0)).toBe(true);
  });
});
