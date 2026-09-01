import type { WeaponClass, WeaponIconId } from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import { EQUIPMENT_ICONS, SILHOUETTE_PATHS, WEAPON_ICONS } from '@/core/glyphs';
import { drawGrenadeMark, drawWeaponMark } from '../helpers/equipment-marks';
import { path2DCount, stubPath2D } from './canvas-globals';

stubPath2D();

/** What a mark painted: the outline it filled, and the rule it filled it with. */
interface Painted {
  readonly parts: string[];
  readonly rules: (CanvasFillRule | undefined)[];
}

function newPainted(): Painted {
  return { parts: [], rules: [] };
}

function newContext(painted: Painted): CanvasRenderingContext2D {
  const ignore = () => {};

  return {
    save: ignore,
    restore: ignore,
    translate: ignore,
    stroke: ignore,
    globalAlpha: 1,
    fillStyle: '',
    fill: (path: { parts: string[] }, rule?: CanvasFillRule) => {
      painted.parts.push(...path.parts);
      painted.rules.push(rule);
    },
  } as unknown as CanvasRenderingContext2D;
}

function paintWeapon(weapon: WeaponClass, icon?: WeaponIconId): Painted {
  const painted = newPainted();
  drawWeaponMark(newContext(painted), 0, 0, weapon, icon, '#ink');

  return painted;
}

describe('drawWeaponMark', () => {
  it("draws Valve's own outline for a weapon the match's table names", () => {
    expect(paintWeapon('rifle', 'ak47').parts).toEqual([WEAPON_ICONS.ak47.d]);
    expect(paintWeapon('rifle', 'm4a1_silencer').parts).toEqual([WEAPON_ICONS.m4a1_silencer.d]);
  });

  it('falls back to the class for a weapon nobody here has drawn', () => {
    // `weaponClass` answers `unknown` rather than failing, so the mark has to answer with a shape
    // rather than with nothing — an unknown weapon is still a weapon.
    expect(paintWeapon('unknown').parts).toEqual(SILHOUETTE_PATHS.unknown);
    expect(paintWeapon('sniper').parts).toEqual(SILHOUETTE_PATHS.sniper);
  });

  it('draws the piece of utility rather than a grenade of no kind', () => {
    expect(paintWeapon('smoke').parts).toEqual([EQUIPMENT_ICONS.smokegrenade.d]);
    expect(paintWeapon('flash').parts).toEqual([EQUIPMENT_ICONS.flashbang.d]);
  });

  it('draws nothing at all for the bomb — §6.4', () => {
    expect(paintWeapon('bomb').parts).toEqual([]);
  });

  it("fills Valve's outlines even-odd and this product's silhouettes non-zero", () => {
    // A trigger guard is a hole in Valve's outline and the non-zero rule would fill it in; the
    // silhouettes are overlapping parts of one object, which even-odd would punch out.
    expect(paintWeapon('rifle', 'awp').rules).toEqual(['evenodd']);
    expect(paintWeapon('knife').rules).toEqual(['nonzero']);
  });

  it('compiles a mark once and keeps it for the session', () => {
    const before = path2DCount();

    paintWeapon('shotgun', 'nova');
    const compiled = path2DCount() - before;

    paintWeapon('shotgun', 'nova');
    paintWeapon('shotgun', 'nova');

    // The set holds what it compiled: this runs inside a draw, ten times a frame, and a `Path2D`
    // per token per frame is the allocation the whole layer is written to avoid.
    expect(compiled).toBeGreaterThan(0);
    expect(path2DCount() - before).toBe(compiled);
  });
});

describe('drawGrenadeMark', () => {
  it("draws the grenade's own object, which is what a label draws for the same kind", () => {
    const painted = newPainted();
    drawGrenadeMark(newContext(painted), 0, 0, 'he', '#he');

    expect(painted.parts).toEqual([EQUIPMENT_ICONS.hegrenade.d]);
    expect(painted.parts).toEqual(paintWeapon('he').parts);
  });

  it('compiles at its own size rather than sharing the label mark', () => {
    // The same object in a different box, so a set is per box: one shared between the two would
    // draw the grenade in flight at the size the name beside a token needs.
    paintWeapon('decoy');
    const afterLabel = path2DCount();

    drawGrenadeMark(newContext(newPainted()), 0, 0, 'decoy', '#decoy');

    expect(path2DCount()).toBeGreaterThan(afterLabel);
  });
});
