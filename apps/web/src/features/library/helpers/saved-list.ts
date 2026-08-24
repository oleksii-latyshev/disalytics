import type { SavedDemo } from '@disa/demo-store';

/** How many rows the card carries before the rest become a disclosure — `docs/DESIGN.md` §10.2. */
export const RECENT_COUNT = 5;

const BYTES_PER_MEGABYTE = 1024 * 1024;

/**
 * The unit belongs to the message rather than to this: `MB` and `МБ` are different strings, and the
 * number itself is formatted by the active locale.
 */
export function megabytesOf(byteLength: number): number {
  return byteLength / BYTES_PER_MEGABYTE;
}

export function visibleDemos(demos: readonly SavedDemo[]): readonly SavedDemo[] {
  return demos.slice(0, RECENT_COUNT);
}

/**
 * What the demos themselves take — `docs/DESIGN.md` §10.2's first figure, and the exact one. It is
 * the catalog's own arithmetic rather than the browser's: `CACHE_BYTE_LIMIT` is what evicts, so
 * this is the number worth stating against it.
 */
export function cachedByteTotal(demos: readonly SavedDemo[]): number {
  return demos.reduce((total, demo) => total + demo.byteLength, 0);
}
