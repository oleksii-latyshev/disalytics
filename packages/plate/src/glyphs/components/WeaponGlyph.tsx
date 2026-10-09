import { isUtilityKind, type WeaponClass, type WeaponIconId } from '@disa/demo-core';
import { WEAPON_ICONS } from '../generated/weapon-icons';
import {
  SILHOUETTE_HEIGHT,
  SILHOUETTE_PATHS,
  SILHOUETTE_WIDTH,
  type SilhouetteClass,
} from '../helpers/silhouettes';
import { UtilityGlyph } from './UtilityGlyph';

interface Props {
  weapon: WeaponClass;
  /** The model, where the caller knows it. Without one the class silhouette is what draws. */
  icon?: WeaponIconId | undefined;
  /** An accessible name, or nothing when the row around the glyph already carries one. */
  label?: string | undefined;
}

/**
 * How tall a weapon reads in a row, in pixels. The icons are drawn in boxes of one height and many
 * widths, which is how Counter-Strike draws them too, so this is the dimension the set agrees on
 * and the width follows from each weapon's own proportions.
 */
const ICON_HEIGHT = 12;

/**
 * Silhouettes drawn by class rather than by model — the fallback for a weapon this product has no
 * outline of. The shapes live in `helpers/silhouettes`, because §6.1's plate mark falls back to the
 * same set on a canvas.
 */
function Silhouette({ weapon }: { weapon: SilhouetteClass }) {
  return (
    <>
      {SILHOUETTE_PATHS[weapon].map((d) => (
        <path key={d} d={d} />
      ))}
    </>
  );
}

/**
 * What a player is holding, or what a kill was dealt with. Utility in the hands draws the utility's
 * own mark, because a player about to throw a flash and a player about to throw a smoke are not the
 * same information.
 *
 * **A weapon the caller can name draws its own outline** — an AK-47, an M4A4 and an M4A1-S are three
 * shapes, because a feed that draws one rifle for all of them says *a rifle* where the reader is
 * asking *which*. Anything else falls back to its class: a weapon this product has never drawn is
 * an outline it does not have, not a row it cannot fill.
 *
 * **The bomb draws nothing** — DESIGN.md §6.4 as restated by #137. The prop reports `C4 Explosive`
 * only while the bomb is *held* and says nothing while it is stowed, so a mark here would be right
 * for a moment and quietly wrong for the rest of the round. An empty slot rather than a placeholder:
 * a placeholder reads as information being withheld, which is a claim of its own.
 */
export function WeaponGlyph({ weapon, icon, label }: Props) {
  if (weapon === 'bomb') return null;

  if (isUtilityKind(weapon)) return <UtilityGlyph kind={weapon} label={label} />;

  const model = icon === undefined ? undefined : WEAPON_ICONS[icon];
  const box = model ?? { width: SILHOUETTE_WIDTH, height: SILHOUETTE_HEIGHT };
  const scale = ICON_HEIGHT / box.height;

  return (
    <svg
      viewBox={`0 0 ${box.width} ${box.height}`}
      width={box.width * scale}
      height={ICON_HEIGHT}
      role={label === undefined ? 'presentation' : 'img'}
      aria-label={label}
      fill="currentColor"
      fillRule="evenodd"
      className="shrink-0"
    >
      {model === undefined ? <Silhouette weapon={weapon} /> : <path d={model.d} />}
    </svg>
  );
}
