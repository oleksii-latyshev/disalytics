export interface SavedFile {
  readonly filename: string;
  readonly content: BlobPart;
  /** The MIME type; a tactic file when left out. */
  readonly type?: string | undefined;
}

const JSON_TYPE = 'application/json';

/** Hands a file to the browser's download. */
export function saveDownload({ filename, content, type = JSON_TYPE }: SavedFile): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
