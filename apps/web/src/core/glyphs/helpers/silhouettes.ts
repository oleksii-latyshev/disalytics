import type { UtilityKind, WeaponClass } from '@disa/demo-core';

/** What is left of a weapon class once utility draws its own mark and the bomb draws nothing. */
export type SilhouetteClass = Exclude<WeaponClass, UtilityKind | 'bomb'>;

/**
 * The box every silhouette is drawn in. A gun is a wide object, so the box is 2:1 rather than
 * square — the same proportion at every size the set is rendered at.
 */
export const SILHOUETTE_WIDTH = 24;
export const SILHOUETTE_HEIGHT = 12;

/**
 * The product's own weapon set, as path data rather than as markup — DESIGN.md §11. It is here and
 * not inside a component because it has **two renderers**: §5.3's team row draws it as SVG and
 * §6.1's plate mark draws it onto a canvas beside a name. Two hand-drawn sets would agree on the
 * day they were written and not a week later, which is the drift §10.6's legend exists to prevent
 * and the same argument applied one level down.
 *
 * Drawn by class and never by model: at either size an AK and an M4 are the same shape, and what a
 * reader needs at a glance is rifle against AWP against pistol. The exact model is on the team card.
 */
export const SILHOUETTE_PATHS: Readonly<Record<SilhouetteClass, readonly string[]>> = {
  pistol: ['M6 3h10v3h-4.6l-1 4.4H7.3L8.4 6H6Z'],
  smg: ['M3 3.8h15v2.7h-4.6l-.7 4h-3l.8-4H3Z'],
  rifle: ['M2 4.2h20v2.6h-7.4l-.7 4h-3l.8-4H2Z', 'M.6 3.2h2.2v4.4H.6Z'],
  sniper: ['M1 5h22v2.2h-9.2l-.7 3.6h-2.9l.8-3.6H1Z', 'M8.6 1.8h7.2v2.6H8.6Z'],
  shotgun: ['M2 3.8h20v2.6H2Z', 'M7.4 6.4h6.4v2H7.4Z', 'M17 6.4h3.4l-1.2 4.2h-3Z'],
  machinegun: ['M2 3.6h20v2.4H2Z', 'M8.6 6h6.2v4.6H8.6Z', 'M17.4 6h3l-1 4h-2.8Z'],
  knife: ['M2.6 9.4 13.6 2l2.2 2.4-10.4 6.4Z', 'M15.4 3.4 21 6.6l-1.6 2.6-5.4-3.4Z'],
  zeus: ['M7 3.6h9v3.2h-4.2l-.8 3.8H8.2L9 6.8H7Z', 'M16 3.9h4.6v1H16Z', 'M16 5.8h4.6v1H16Z'],
  // A disc, written as a path rather than as a `<circle>` so that every entry in this table is one
  // kind of thing and the canvas renderer needs no second branch to read it.
  unknown: ['M12 3.4a2.6 2.6 0 1 0 0 5.2 2.6 2.6 0 1 0 0-5.2Z'],
};

/**
 * One grenade for every kind of utility, which is what the plate can carry — a smoke, a flash and
 * a molotov are three distinguishable marks at §5.3's 12px and one blur at §6.1's. The team row
 * draws `UtilityGlyph` instead, where there is room for the distinction.
 */
export const GRENADE_SILHOUETTE: readonly string[] = [
  'M10.6 1.4h2.8v2.2h-2.8Z',
  'M12 3.2a4 4 0 1 0 0 8 4 4 0 1 0 0-8Z',
];
