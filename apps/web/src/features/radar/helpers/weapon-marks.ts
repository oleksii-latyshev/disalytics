import { isUtilityKind, type WeaponClass } from '@disa/demo-core';
import {
  GRENADE_SILHOUETTE,
  SILHOUETTE_HEIGHT,
  SILHOUETTE_PATHS,
  SILHOUETTE_WIDTH,
} from '@/core/glyphs';

/**
 * The box a weapon mark is drawn in, centred on the point the caller gives — DESIGN.md §6.1.
 *
 * It is 2:1 rather than the square that section first asked for, and the reason is worth keeping: a
 * gun is a wide object, and squeezing the same set into 8×8 turned every long gun into the letter T.
 * Fourteen pixels is where the scope on an AWP and the stock on a rifle survive the reduction from
 * §5.3's 24px, and it is still shorter than the name it leads.
 */
export const WEAPON_MARK_PX = 14;
export const WEAPON_MARK_HEIGHT_PX = (WEAPON_MARK_PX * SILHOUETTE_HEIGHT) / SILHOUETTE_WIDTH;

const SCALE = WEAPON_MARK_PX / SILHOUETTE_WIDTH;

/**
 * The same shapes §5.3's team row draws, compiled to plate scale once. A class is compiled the
 * first time anybody is holding it and kept for the rest of the session, because this is read
 * inside a draw and nothing on the way to the canvas may allocate.
 *
 * The scale is baked into the path rather than applied to the context, so the halo the caller has
 * already set keeps the width it has beside the name — `context.scale` would shrink the stroke with
 * the shape and leave a mark haloed more faintly than the label it belongs to.
 */
const compiled = new Map<WeaponClass, Path2D>();

function pathFor(weapon: WeaponClass): Path2D | null {
  const held = compiled.get(weapon);
  if (held !== undefined) return held;
  // DESIGN.md §6.4 — the bomb is off the plate as a rendering rule, so there is nothing to compile.
  if (weapon === 'bomb') return null;

  const data = isUtilityKind(weapon) ? GRENADE_SILHOUETTE : SILHOUETTE_PATHS[weapon];
  const path = new Path2D();

  for (const d of data) path.addPath(new Path2D(d), { a: SCALE, d: SCALE });

  compiled.set(weapon, path);

  return path;
}

/**
 * What a player is holding, beside the name that says who they are — DESIGN.md §6.1. The **halo is
 * the caller's**, already on the context: the mark is part of the label rather than a mark of its
 * own, so it shares the label's stroke instead of configuring a second one that could drift from it
 * (`haloStroke` is where both callers get it).
 *
 * **The bomb draws nothing** — §6.4. The prop reports `C4 Explosive` only while the bomb is *held*
 * and says nothing while it is stowed, so a mark here would be right for a moment and quietly wrong
 * for the rest of the round. An empty box, never a placeholder.
 */
export function drawWeaponMark(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  weapon: WeaponClass,
  ink: string,
): void {
  const path = pathFor(weapon);
  if (path === null) return;

  context.save();
  context.translate(x - WEAPON_MARK_PX / 2, y - WEAPON_MARK_HEIGHT_PX / 2);

  context.stroke(path);
  context.fillStyle = ink;
  context.fill(path);
  context.restore();
}
