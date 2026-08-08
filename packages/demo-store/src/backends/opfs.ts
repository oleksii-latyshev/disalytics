import type { StoreBackend } from '../backend';

const DIRECTORY = 'demos';

function isMissing(thrown: unknown): boolean {
  return thrown instanceof DOMException && thrown.name === 'NotFoundError';
}

async function readFile(
  directory: FileSystemDirectoryHandle,
  name: string,
): Promise<Uint8Array<ArrayBuffer> | null> {
  try {
    const handle = await directory.getFileHandle(name);
    const file = await handle.getFile();

    return new Uint8Array(await file.arrayBuffer());
  } catch (thrown) {
    if (isMissing(thrown)) return null;
    throw thrown;
  }
}

async function writeFile(
  directory: FileSystemDirectoryHandle,
  name: string,
  chunks: readonly Uint8Array<ArrayBuffer>[],
): Promise<void> {
  const handle = await directory.getFileHandle(name, { create: true });
  const stream = await handle.createWritable();

  try {
    for (const chunk of chunks) await stream.write(chunk);
  } catch (thrown) {
    await stream.abort();
    throw thrown;
  }

  await stream.close();
}

async function removeFile(directory: FileSystemDirectoryHandle, name: string): Promise<void> {
  try {
    await directory.removeEntry(name);
  } catch (thrown) {
    if (!isMissing(thrown)) throw thrown;
  }
}

async function listFiles(directory: FileSystemDirectoryHandle): Promise<readonly string[]> {
  const names: string[] = [];

  for await (const name of directory.keys()) names.push(name);

  return names;
}

/**
 * `null` when this browser has no OPFS. Firefox in private browsing exposes `getDirectory` and
 * throws from it, so the call itself is the feature detection and a rejection is a negative answer
 * rather than a failure to report.
 */
export async function openOpfsBackend(): Promise<StoreBackend | null> {
  if (typeof navigator === 'undefined') return null;
  if (typeof navigator.storage?.getDirectory !== 'function') return null;

  let directory: FileSystemDirectoryHandle;

  try {
    const root = await navigator.storage.getDirectory();
    directory = await root.getDirectoryHandle(DIRECTORY, { create: true });
  } catch {
    return null;
  }

  return {
    kind: 'opfs',
    read: (name) => readFile(directory, name),
    write: (name, chunks) => writeFile(directory, name, chunks),
    remove: (name) => removeFile(directory, name),
    list: () => listFiles(directory),
  };
}
