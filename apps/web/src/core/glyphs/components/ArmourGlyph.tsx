import { EQUIPMENT_ICONS } from '../generated/equipment-icons';
import { armourIcon } from '../helpers/equipment';

interface Props {
  /** `TickTrack.armour` at this frame. Zero draws nothing at all. */
  armour: number;
  /** The `FLAG_HELMET` bit, which is what picks the second of the two icons. */
  hasHelmet: boolean;
  /** An accessible name, or nothing where the row around the glyph already carries one. */
  label?: string | undefined;
  /**
   * The ink, on the glyph itself rather than on a wrapper the caller supplies. A wrapper is an
   * element whether or not this draws, and an empty one still takes a share of its parent's `gap` —
   * measured on the fixture's pistol round, the three players with no vest each carried 6px of
   * space where the mark would have been.
   */
  className?: string | undefined;
}

/** The height a row gives it, matching the weapon mark beside it. */
const ICON_HEIGHT = 12;

/**
 * What a player is wearing, in Valve's own outline: the vest alone, or the vest with the helmet
 * beside it. That is the distinction Counter-Strike itself draws, and it is the whole reading — a
 * helmet without a vest is not a state the game has, so there are two icons and not three.
 *
 * It replaces a hand-drawn helmet pip and, before that, a 16px track that read as an em-dash next to
 * the health figure. The value behind it is not lost: the row states `armour` in words to a screen
 * reader, so a vest worn down to 34 is still 34 to anyone who cannot see the mark.
 *
 * Drawn like the weapon set — one height, the width following each icon's own box — so the pair is
 * a wider mark than the vest rather than a smaller one squeezed into the same square.
 */
export function ArmourGlyph({ armour, hasHelmet, label, className = '' }: Props) {
  const id = armourIcon(armour, hasHelmet);
  if (id === null) return null;

  const icon = EQUIPMENT_ICONS[id];
  const scale = ICON_HEIGHT / icon.height;

  return (
    <svg
      viewBox={`0 0 ${icon.width} ${icon.height}`}
      width={icon.width * scale}
      height={ICON_HEIGHT}
      role={label === undefined ? 'presentation' : 'img'}
      aria-label={label}
      fill="currentColor"
      fillRule="evenodd"
      className={`shrink-0 ${className}`}
    >
      <path d={icon.d} />
    </svg>
  );
}
