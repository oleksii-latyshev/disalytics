import { type CommitDecision, MAX_PHOTOS_PER_COMMIT } from '@disa/admin-contract';
import { type Lineup, localImageHash } from '@disa/demo-core';

/** Characters of embedded photo data one commit may carry; the Worker's body cap is 40 MB. */
export const MAX_IMAGE_CHARS = 20_000_000;

/** One request: some decisions, and the embedded photos they use. */
export interface Part {
  readonly decisions: CommitDecision[];
  readonly images: Record<string, string>;
}

export interface Writing {
  readonly action: 'add' | 'replace';
  readonly targetId?: string;
  /** The id the lineup had in the file, so the Worker remembers it as an alias of the target. */
  readonly sourceId?: string;
  readonly lineup: Lineup;
}

/** The refs of a lineup the Worker has to store: everything that is not already in our storage. */
export function refsToStore(lineup: Lineup, photoBase: string): string[] {
  const refs = (lineup.imageUrls ?? []).filter((url) => !url.startsWith(`${photoBase}/`));
  return [...new Set(refs)];
}

function dataOf(ref: string, images: Readonly<Record<string, string>>): string {
  const hash = localImageHash(ref);
  return hash === null ? '' : (images[hash] ?? '');
}

interface Filling {
  part: Part;
  refs: Set<string>;
  chars: number;
}

function fresh(): Filling {
  return { part: { decisions: [], images: {} }, refs: new Set(), chars: 0 };
}

function fits(filling: Filling, refs: readonly string[], images: Readonly<Record<string, string>>) {
  const added = refs.filter((ref) => !filling.refs.has(ref));
  const addedChars = added.reduce((sum, ref) => sum + dataOf(ref, images).length, 0);
  return (
    filling.part.decisions.length === 0 ||
    (filling.refs.size + added.length <= MAX_PHOTOS_PER_COMMIT &&
      filling.chars + addedChars <= MAX_IMAGE_CHARS)
  );
}

function put(
  filling: Filling,
  writing: Writing,
  refs: readonly string[],
  images: Readonly<Record<string, string>>,
): void {
  for (const ref of refs) {
    const hash = localImageHash(ref);
    const data = dataOf(ref, images);
    if (hash !== null && data !== '') filling.part.images[hash] = data;
    if (!filling.refs.has(ref)) {
      filling.refs.add(ref);
      filling.chars += data.length;
    }
  }
  filling.part.decisions.push({
    action: writing.action,
    ...(writing.targetId === undefined ? {} : { targetId: writing.targetId }),
    ...(writing.sourceId === undefined ? {} : { sourceId: writing.sourceId }),
    lineup: writing.lineup,
  });
}

/**
 * Splits the lineups to write into requests that each stay under the Worker's photo count and body
 * size. A lineup is never split; one that is over the cap by itself gets a request of its own and
 * the Worker will say so.
 */
export function planParts(
  writings: readonly Writing[],
  images: Readonly<Record<string, string>>,
  photoBase: string,
): Part[] {
  const parts: Part[] = [];
  let filling = fresh();
  for (const writing of writings) {
    const refs = refsToStore(writing.lineup, photoBase);
    if (!fits(filling, refs, images)) {
      parts.push(filling.part);
      filling = fresh();
    }
    put(filling, writing, refs, images);
  }
  if (filling.part.decisions.length > 0) parts.push(filling.part);
  return parts;
}
