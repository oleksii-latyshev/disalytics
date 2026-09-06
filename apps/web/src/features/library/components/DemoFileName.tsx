interface Props {
  fileName: string;
  /**
   * How many lines it may take. The way in's saved row is one line of a compact list; a library
   * card gives it two, because the file name is **what tells two Mirage demos apart** — that is
   * #234's own reason for putting it there, and one truncated line is where it stops doing it.
   */
  lines?: 1 | 2;
}

/**
 * A `<span>` rather than a `<p>`: both the saved row and the library card put this inside the button
 * that opens the demo, and a button admits phrasing content only.
 */
export function DemoFileName({ fileName, lines = 1 }: Props) {
  return (
    <span
      // Two lines are a *box* rather than a maximum: a card whose name fits on one line has to be
      // the same height as the card beside it, and a wall of equal cards is what the grid needs.
      className={`numeric block text-12 text-ink-dim ${lines === 1 ? 'truncate' : 'line-clamp-2 h-8 wrap-anywhere'}`}
      title={fileName}
    >
      {fileName}
    </span>
  );
}
