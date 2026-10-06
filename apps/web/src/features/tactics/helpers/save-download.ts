import type { TacticDownload } from './tactic-transfer';

/** Hands a file to the browser's download. */
export function saveDownload({ filename, content }: TacticDownload): void {
  const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
