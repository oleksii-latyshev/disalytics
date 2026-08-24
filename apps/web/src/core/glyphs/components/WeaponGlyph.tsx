import { isUtilityKind, type WeaponClass } from '@disa/demo-core';
import {
  SILHOUETTE_HEIGHT,
  SILHOUETTE_PATHS,
  SILHOUETTE_WIDTH,
  type SilhouetteClass,
} from '../helpers/silhouettes';
import { UtilityGlyph } from './UtilityGlyph';

interface Props {
  weapon: WeaponClass;
  /** An accessible name, or nothing when the row around the glyph already carries one. */
  label?: string | undefined;
}

/**
 * Silhouettes drawn by class rather than by model — DESIGN.md §5.3 gives a team row one glyph, and
 * at that size an AK and an M4 are the same shape. The shapes themselves live in
 * `helpers/silhouettes`, because §6.1's plate mark draws the same set onto a canvas.
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
 * What a player is holding. Utility in the hands draws the utility's own mark, because a player
 * about to throw a flash and a player about to throw a smoke are not the same information.
 *
 * **The bomb draws nothing** — DESIGN.md §6.4 as restated by #137. The prop reports `C4 Explosive`
 * only while the bomb is *held* and says nothing while it is stowed, so a mark here would be right
 * for a moment and quietly wrong for the rest of the round. An empty slot rather than a placeholder:
 * a placeholder reads as information being withheld, which is a claim of its own.
 */
export function WeaponGlyph({ weapon, label }: Props) {
  if (weapon === 'bomb') return null;

  if (isUtilityKind(weapon)) return <UtilityGlyph kind={weapon} label={label} />;

  return (
    <svg
      viewBox={`0 0 ${SILHOUETTE_WIDTH} ${SILHOUETTE_HEIGHT}`}
      role={label === undefined ? 'presentation' : 'img'}
      aria-label={label}
      fill="currentColor"
      className="h-3 w-6 shrink-0"
    >
      <Silhouette weapon={weapon} />
    </svg>
  );
}
