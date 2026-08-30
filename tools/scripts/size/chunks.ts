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

export interface Binary {
  readonly path: string;
  readonly size: number;
  readonly digest: string;
}

export interface Mismatch {
  readonly reason: 'more than one' | 'differs from the built parser';
  readonly binaries: readonly Binary[];
}

/**
 * Whether the binary in `dist` is the binary the parser build wrote. Deleting `dist` does not
 * settle this: a Turborepo cache hit restores the directory without running Vite, and the generated
 * `pkg/` is not part of `@disa/web#build`'s cache key, so a rebuilt parser leaves the previous
 * binary in place under its old content hash — measured on 12 August 2026, 2,221,471 B reported for
 * a branch whose binary was 2,246,819 B. A budget measured against a stale artifact is not a budget.
 */
export function binaryMismatch(
  shipped: readonly Binary[],
  built: Binary | undefined,
): Mismatch | undefined {
  if (shipped.length > 1) return { reason: 'more than one', binaries: [...shipped] };

  const one = shipped.at(0);
  if (one === undefined || built === undefined) return undefined;
  if (one.digest === built.digest) return undefined;

  return { reason: 'differs from the built parser', binaries: [one, built] };
}
