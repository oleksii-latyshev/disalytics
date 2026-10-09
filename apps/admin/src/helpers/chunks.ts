import { MAX_PHOTOS_PER_COMMIT, type Resolution } from '@disa/admin-contract';
import { type Lineup, localImageHash } from '@disa/demo-core';

/** Characters of embedded photo data one commit may carry; the Worker's body cap is 40 MB. */
export const MAX_IMAGE_CHARS = 20_000_000;

export interface Chunk {
  readonly lineups: Lineup[];
  readonly resolutions: Resolution[];
  readonly images: Record<string, string>;
}

function hashOf(ref: string): string | null {
  return localImageHash(ref);
}

function sizeOf(ref: string, images: Readonly<Record<string, string>>): number {
  const hash = hashOf(ref);
  return hash === null ? 0 : (images[hash]?.length ?? 0);
}

function emptyChunk(): Chunk {
  return { lineups: [], resolutions: [], images: {} };
}

interface Filling {
  chunk: Chunk;
  refs: Set<string>;
  chars: number;
}

function fresh(): Filling {
  return { chunk: emptyChunk(), refs: new Set(), chars: 0 };
}

function overflows(filling: Filling, lineup: Lineup, images: Readonly<Record<string, string>>) {
  const added = [...new Set(lineup.imageUrls ?? [])].filter((ref) => !filling.refs.has(ref));
  const addedChars = added.reduce((sum, ref) => sum + sizeOf(ref, images), 0);
  return (
    filling.chunk.lineups.length > 0 &&
    (filling.refs.size + added.length > MAX_PHOTOS_PER_COMMIT ||
      filling.chars + addedChars > MAX_IMAGE_CHARS)
  );
}

function put(
  filling: Filling,
  lineup: Lineup,
  resolution: Resolution,
  images: Readonly<Record<string, string>>,
): void {
  for (const ref of lineup.imageUrls ?? []) {
    const hash = hashOf(ref);
    const data = hash === null ? undefined : images[hash];
    if (hash !== null && data !== undefined) filling.chunk.images[hash] = data;
    if (!filling.refs.has(ref)) {
      filling.refs.add(ref);
      filling.chars += sizeOf(ref, images);
    }
  }
  filling.chunk.lineups.push(lineup);
  filling.chunk.resolutions.push(resolution);
}

/**
 * Splits the lineups to write into commits that each stay under the Worker's photo cap and body
 * size. A lineup is never split; one that is over the cap alone gets a commit of its own and the
 * Worker will say so.
 */
export function planChunks(
  entries: readonly { readonly lineup: Lineup; readonly resolution: Resolution }[],
  images: Readonly<Record<string, string>>,
): Chunk[] {
  const chunks: Chunk[] = [];
  let filling = fresh();
  for (const { lineup, resolution } of entries) {
    if (overflows(filling, lineup, images)) {
      chunks.push(filling.chunk);
      filling = fresh();
    }
    put(filling, lineup, resolution, images);
  }
  if (filling.chunk.lineups.length > 0) chunks.push(filling.chunk);
  return chunks;
}
