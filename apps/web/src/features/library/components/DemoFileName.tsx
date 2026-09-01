interface Props {
  fileName: string;
}

/**
 * A `<span>` rather than a `<p>`: both the saved row and the library card put this inside the button
 * that opens the demo, and a button admits phrasing content only.
 */
export function DemoFileName({ fileName }: Props) {
  return (
    <span className="numeric block truncate text-12 text-ink-dim" title={fileName}>
      {fileName}
    </span>
  );
}
