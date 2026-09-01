import type { UtilityKind } from '@disa/demo-core';
import { EQUIPMENT_ICONS } from '../generated/equipment-icons';
import { UTILITY_ICON } from '../helpers/equipment';
import { GLYPH_SIZE_CLASS, type GlyphSize } from '../helpers/size';

interface Props {
  kind: UtilityKind;
  /** An accessible name, or nothing when a list around the glyph already carries one. */
  label?: string | undefined;
  size?: GlyphSize;
}

/**
 * Each utility's own colour — DESIGN.md §2.4. Decoy and the defuse kit have no semantic token and
 * are not getting one invented: a decoy is a lie about a grenade rather than a grenade, and a kit
 * is equipment. Both sit at `--ink-dim`, which is where §2.4 puts anything that is not the thing a
 * semantic colour names.
 */
export const UTILITY_INK: Readonly<Record<UtilityKind, string>> = {
  he: 'text-nade-he',
  flash: 'text-nade-flash',
  smoke: 'text-nade-smoke',
  fire: 'text-nade-molotov',
  decoy: 'text-ink-dim',
  kit: 'text-ink-dim',
};

/**
 * One piece of utility, in Valve's own outline — the same art Counter-Strike draws in its buy menu,
 * arriving the way the weapon icons and the armour do. It replaced a set drawn here: six shapes that
 * said *a grenade of some kind* where a reader looking at a buy is asking *which*.
 *
 * **The box stays square and the icon is fitted inside it.** Valve draws these to one height and many
 * widths — a smoke is 15 units wide against the defuser's 36 — and two things in this product depend
 * on a utility mark being as wide as it is tall: §7.1's round axis spaces its symbols on a
 * `GLYPH_PITCH_PX` that *is* one glyph's width, and a team row's run of marks is laid out on the same
 * assumption. Letterboxing inside a square viewBox keeps both true, and costs a wide icon nothing but
 * the air above and below it.
 *
 * The colour is still `UTILITY_INK`'s: the outline says which object, the hue says which kind, and
 * neither is doing the other's job.
 */
export function UtilityGlyph({ kind, label, size = 'row' }: Props) {
  const icon = EQUIPMENT_ICONS[UTILITY_ICON[kind]];
  // A square window centred on the icon's own box, so the mark keeps its proportions and the box
  // keeps its width. `preserveAspectRatio` does the fitting; nothing here scales a path.
  const side = Math.max(icon.width, icon.height);
  const viewBox = `${(icon.width - side) / 2} ${(icon.height - side) / 2} ${side} ${side}`;

  return (
    <svg
      viewBox={viewBox}
      role={label === undefined ? 'presentation' : 'img'}
      aria-label={label}
      fill="currentColor"
      fillRule="evenodd"
      className={`${GLYPH_SIZE_CLASS[size]} shrink-0 ${UTILITY_INK[kind]}`}
    >
      <path d={icon.d} />
    </svg>
  );
}
