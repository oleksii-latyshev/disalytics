import { isUtilityKind, type UtilityKind, type WeaponClass } from '@disa/demo-core';
import { UtilityGlyph } from './UtilityGlyph';

/** What is left once utility draws its own mark and the bomb draws nothing. */
type SilhouetteClass = Exclude<WeaponClass, UtilityKind | 'bomb'>;

interface Props {
  weapon: WeaponClass;
  /** An accessible name, or nothing when the row around the glyph already carries one. */
  label?: string | undefined;
}

/**
 * Silhouettes in a 24×12 box, drawn by class rather than by model — DESIGN.md §5.3 gives a team row
 * one glyph, and at that size an AK and an M4 are the same shape. What a reader needs from five
 * rows at a glance is rifle against AWP against pistol, which is the resolution `weaponClass`
 * carries.
 */
function Silhouette({ weapon }: { weapon: SilhouetteClass }) {
  switch (weapon) {
    case 'pistol':
      return <path d="M6 3h10v3h-4.6l-1 4.4H7.3L8.4 6H6Z" />;
    case 'smg':
      return <path d="M3 3.8h15v2.7h-4.6l-.7 4h-3l.8-4H3Z" />;
    case 'rifle':
      return (
        <>
          <path d="M2 4.2h20v2.6h-7.4l-.7 4h-3l.8-4H2Z" />
          <path d="M.6 3.2h2.2v4.4H.6Z" />
        </>
      );
    case 'sniper':
      return (
        <>
          <path d="M1 5h22v2.2h-9.2l-.7 3.6h-2.9l.8-3.6H1Z" />
          <path d="M8.6 1.8h7.2v2.6H8.6Z" />
        </>
      );
    case 'shotgun':
      return (
        <>
          <path d="M2 3.8h20v2.6H2Z" />
          <path d="M7.4 6.4h6.4v2H7.4Z" />
          <path d="M17 6.4h3.4l-1.2 4.2h-3Z" />
        </>
      );
    case 'machinegun':
      return (
        <>
          <path d="M2 3.6h20v2.4H2Z" />
          <path d="M8.6 6h6.2v4.6H8.6Z" />
          <path d="M17.4 6h3l-1 4h-2.8Z" />
        </>
      );
    case 'knife':
      return (
        <>
          <path d="M2.6 9.4 13.6 2l2.2 2.4-10.4 6.4Z" />
          <path d="M15.4 3.4 21 6.6l-1.6 2.6-5.4-3.4Z" />
        </>
      );
    case 'zeus':
      return (
        <>
          <path d="M7 3.6h9v3.2h-4.2l-.8 3.8H8.2L9 6.8H7Z" />
          <path d="M16 3.9h4.6v1H16Z" />
          <path d="M16 5.8h4.6v1H16Z" />
        </>
      );
    case 'unknown':
      return <circle cx="12" cy="6" r="2.6" />;
  }
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
      viewBox="0 0 24 12"
      role={label === undefined ? 'presentation' : 'img'}
      aria-label={label}
      fill="currentColor"
      className="h-3 w-6 shrink-0"
    >
      <Silhouette weapon={weapon} />
    </svg>
  );
}
