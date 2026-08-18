/** What a kill row can qualify a kill with — DESIGN.md §5.4. */
export type KillMarkKind = 'headshot' | 'wallbang' | 'smoke';

interface Props {
  kind: KillMarkKind;
  /** An accessible name, or nothing when the row around the mark already carries one. */
  label?: string | undefined;
}

function Mark({ kind }: { kind: KillMarkKind }) {
  switch (kind) {
    case 'headshot':
      return (
        <>
          <circle cx="6" cy="6" r="4.1" fill="none" stroke="currentColor" strokeWidth="1.2" />
          <circle cx="6" cy="6" r="1.5" />
        </>
      );
    case 'wallbang':
      return (
        <>
          <path d="M5.1 1h1.8v10H5.1Z" />
          <path
            d="M.8 6h3.1M9.1 6h2.1"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </>
      );
    case 'smoke':
      return (
        <>
          <circle cx="4" cy="6.6" r="2.6" />
          <circle cx="7.6" cy="6.9" r="2.3" />
          <circle cx="6.1" cy="4.6" r="2.5" />
        </>
      );
  }
}

/**
 * The qualifier beside a kill in the feed — a headshot, a shot through a wall, a shot through
 * smoke. Drawn from the product's own set in the same 12-unit box as `EventGlyph` (§11), and
 * carrying no colour of its own: §5.4 reads these as secondary to the two names, so the row is what
 * decides their ink.
 *
 * They are always drawn at 12px. The two `GlyphSize` steps exist because §7.1's axis needed room
 * for a symbol; a mark that qualifies a line of text has exactly the size the line gives it.
 */
export function KillMark({ kind, label }: Props) {
  return (
    <svg
      viewBox="0 0 12 12"
      role={label === undefined ? 'presentation' : 'img'}
      aria-label={label}
      fill="currentColor"
      className="size-3 shrink-0"
    >
      <Mark kind={kind} />
    </svg>
  );
}
