import { GLYPH_SIZE_CLASS, type GlyphSize } from '../helpers/size';

/** What a round axis marks: a death, a plant and a defuse — DESIGN.md §7.1. */
export type EventKind = 'kill' | 'plant' | 'defuse';

interface Props {
  kind: EventKind;
  /** An accessible name, or nothing when a list around the glyph already carries one. */
  label?: string | undefined;
  size?: GlyphSize;
}

function Mark({ kind }: { kind: EventKind }) {
  switch (kind) {
    case 'kill':
      return (
        <path
          fillRule="evenodd"
          d="M6 1c-2.6 0-4.4 1.8-4.4 4.3 0 1.5.6 2.7 1.6 3.4v1.5c0 .4.3.7.7.7h4.2c.4 0 .7-.3.7-.7V8.7c1-.7 1.6-1.9 1.6-3.4C10.4 2.8 8.6 1 6 1Zm-1.7 5.5a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5Zm3.4 0a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5ZM6 8.6l-.7-1.3h1.4L6 8.6Z"
        />
      );
    case 'plant':
      return (
        <>
          <circle cx="5.3" cy="7.5" r="3.6" />
          <path
            d="M7.9 4.2 9.3 2.8"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
          <circle cx="10.4" cy="1.8" r="1.05" />
        </>
      );
    case 'defuse':
      return (
        <g fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round">
          <path d="M2.7 1.4 7.3 7" />
          <path d="M9.3 1.4 4.7 7" />
          <circle cx="3.9" cy="9.2" r="1.6" />
          <circle cx="8.1" cy="9.2" r="1.6" />
        </g>
      );
  }
}

/**
 * An event mark from the product's own set rather than an icon library — DESIGN.md §11, the same
 * 12-unit box `UtilityGlyph` is drawn in. It carries no colour of its own: the kill is tinted by the
 * side of the player who died and the two objective marks by `--objective`, and both of those are
 * the caller's to know.
 */
export function EventGlyph({ kind, label, size = 'row' }: Props) {
  return (
    <svg
      viewBox="0 0 12 12"
      role={label === undefined ? 'presentation' : 'img'}
      aria-label={label}
      fill="currentColor"
      className={`${GLYPH_SIZE_CLASS[size]} shrink-0`}
    >
      <Mark kind={kind} />
    </svg>
  );
}
