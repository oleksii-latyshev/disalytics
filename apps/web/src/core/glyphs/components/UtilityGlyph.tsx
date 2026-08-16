import type { UtilityKind } from '@disa/demo-core';
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

function Mark({ kind }: { kind: UtilityKind }) {
  switch (kind) {
    case 'he':
      return (
        <>
          <rect x="4.9" y="1.4" width="2.2" height="2.2" rx="0.6" />
          <circle cx="6" cy="7.2" r="3.4" />
        </>
      );
    case 'flash':
      return (
        <>
          <rect x="4.6" y="1.2" width="2.8" height="4" rx="1.4" />
          <circle cx="6" cy="8" r="3" />
        </>
      );
    case 'smoke':
      return <rect x="3.1" y="1.6" width="5.8" height="8.8" rx="2.9" />;
    case 'fire':
      return <path d="M6 1.2c2.6 3.2 3.6 4.8 3.6 6.5a3.6 3.6 0 0 1-7.2 0c0-1.7 1-3.3 3.6-6.5Z" />;
    case 'decoy':
      return (
        <>
          <rect x="4.9" y="1.4" width="2.2" height="2.2" rx="0.6" />
          <circle cx="6" cy="7.2" r="2.7" fill="none" stroke="currentColor" strokeWidth="1.3" />
        </>
      );
    case 'kit':
      return (
        <>
          <path d="M4.4 4.2V3.1h3.2v1.1" fill="none" stroke="currentColor" strokeWidth="1.2" />
          <rect x="1.8" y="4.4" width="8.4" height="5.8" rx="1.2" />
        </>
      );
  }
}

/**
 * One piece of utility, from the product's own set rather than an icon library — DESIGN.md §11.
 * Drawn in a 12-unit box and rendered at whichever of the two sizes its caller has room for, so the
 * same mark reads beside a name in a row and on a round axis.
 */
export function UtilityGlyph({ kind, label, size = 'row' }: Props) {
  return (
    <svg
      viewBox="0 0 12 12"
      role={label === undefined ? 'presentation' : 'img'}
      aria-label={label}
      fill="currentColor"
      className={`${GLYPH_SIZE_CLASS[size]} shrink-0 ${UTILITY_INK[kind]}`}
    >
      <Mark kind={kind} />
    </svg>
  );
}
