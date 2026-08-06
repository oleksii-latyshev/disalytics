interface Props {
  fileName: string;
}

export function DemoFileName({ fileName }: Props) {
  return (
    <p className="numeric truncate text-12 text-ink-faint" title={fileName}>
      {fileName}
    </p>
  );
}
