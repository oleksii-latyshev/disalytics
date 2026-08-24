/** A separator between facts, not a word: it is drawn for the eye and hidden from the reader. */
export function MetaDot() {
  return (
    <span aria-hidden="true" className="text-ink-faint">
      ·
    </span>
  );
}
