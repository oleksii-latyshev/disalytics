// Vite's default content hash: eight base64url characters at the end of the chunk's stem.
// Stripping it is what makes two builds' copies of one chunk comparable by name.
const HASHED = /^(?<family>.+)-[A-Za-z0-9_-]{8}$/;

export interface ChunkFamily {
  readonly family: string;
  readonly names: readonly string[];
}

/** A chunk's name without its extension or its content hash. An unhashed name is its own family. */
export function chunkFamily(name: string): string {
  const stem = name.replace(/\.js$/, '');

  return HASHED.exec(stem)?.groups?.family ?? stem;
}

/**
 * Families holding more than one file, which is a directory carrying output from more than one
 * build: Vite emits a chunk name once per build, so a second copy of it can only have been left
 * behind by an earlier one.
 */
export function staleFamilies(names: readonly string[]): readonly ChunkFamily[] {
  const byFamily = new Map<string, string[]>();

  for (const name of names) {
    const family = chunkFamily(name);
    const seen = byFamily.get(family);

    if (seen === undefined) byFamily.set(family, [name]);
    else seen.push(name);
  }

  return [...byFamily]
    .filter(([, names]) => names.length > 1)
    .map(([family, names]) => ({ family, names: [...names].sort() }))
    .sort((a, b) => a.family.localeCompare(b.family));
}
