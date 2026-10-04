/**
 * What the file picker offers by default. The container is identified from magic bytes rather than
 * from the name, so this narrows the picker and nothing else — a renamed demo still opens.
 */
export const ACCEPTED_EXTENSIONS = '.dem,.dem.zst,.dem.bz2';

/**
 * The file a picker was given, and the input cleared behind it — without that, choosing the same
 * file twice in a row never fires a second `change`.
 */
export function takeChosenFile(input: HTMLInputElement): File | null {
  const chosen = input.files?.item(0) ?? null;
  input.value = '';

  return chosen;
}

/**
 * Whether a drag is carrying files from outside the page. A tile being rearranged drags text, and
 * must not light the app-wide drop-a-demo overlay.
 */
export function carriesFiles(types: readonly string[] | undefined): boolean {
  return types?.includes('Files') === true;
}
