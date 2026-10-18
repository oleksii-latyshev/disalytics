import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';

/** `.disa` / `.disa.gz` files of a directory, by name; none when the variable is unset. */
export function containersIn(directory: string | undefined): string[] {
  if (directory === undefined || directory === '') return [];
  return readdirSync(directory)
    .filter((name) => name.endsWith('.disa') || name.endsWith('.disa.gz'))
    .sort()
    .map((name) => join(directory, name));
}

export function readContainer(path: string): Uint8Array<ArrayBuffer> {
  const bytes = readFileSync(path);
  return new Uint8Array(path.endsWith('.gz') ? gunzipSync(bytes) : bytes);
}
