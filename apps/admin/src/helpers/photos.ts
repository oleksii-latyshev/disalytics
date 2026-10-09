import { type Lineup, localImageHash } from '@disa/demo-core';

export interface Size {
  readonly width: number;
  readonly height: number;
}

/** Pixels per photo ref, as measured once the image is decoded. */
export type Sizes = ReadonlyMap<string, Size>;

export interface PhotoTile {
  /** `s<index>` for a photo of the site's lineup, `f<index>` for one only the file has. */
  readonly id: string;
  readonly from: 'stored' | 'file' | 'both';
  /** The ref that is kept if the tile is. */
  readonly url: string;
  readonly caption: string;
}

export type PhotoGroup =
  | { readonly kind: 'same'; readonly tile: PhotoTile }
  | { readonly kind: 'pair'; readonly stored: PhotoTile; readonly file: PhotoTile }
  | { readonly kind: 'single'; readonly tile: PhotoTile };

/**
 * What a photo is, whichever way it is written: a `local:<sha>` and our stored `<base>/<sha>` are
 * the same bytes, so they are the same photo. Any other link is its own address.
 */
export function photoKey(url: string, photoBase: string): string {
  const local = localImageHash(url);
  if (local !== null) return `sha:${local}`;
  if (url.startsWith(`${photoBase}/`)) return `sha:${url.slice(photoBase.length + 1)}`;
  return `url:${url}`;
}

function tilesOf(lineup: Lineup, prefix: 's' | 'f', from: 'stored' | 'file'): PhotoTile[] {
  return (lineup.imageUrls ?? []).map((url, index) => ({
    id: `${prefix}${index}`,
    from,
    url,
    caption: lineup.imageCaptions?.[index] ?? '',
  }));
}

/**
 * The photos of both sides laid out for choosing: a photo both have is one tile; the rest are
 * paired in order, the site's first, so two takes of the same shot sit side by side.
 */
export function groupPhotos(stored: Lineup, file: Lineup, photoBase: string): PhotoGroup[] {
  const storedTiles = tilesOf(stored, 's', 'stored');
  const fileTiles = tilesOf(file, 'f', 'file');
  const fileByKey = new Map(fileTiles.map((tile) => [photoKey(tile.url, photoBase), tile]));
  const storedKeys = new Set(storedTiles.map((tile) => photoKey(tile.url, photoBase)));
  const unmatched = fileTiles.filter((tile) => !storedKeys.has(photoKey(tile.url, photoBase)));

  const groups: PhotoGroup[] = [];
  let next = 0;
  for (const tile of storedTiles) {
    const twin = fileByKey.get(photoKey(tile.url, photoBase));
    if (twin !== undefined) {
      const caption = tile.caption === '' ? twin.caption : tile.caption;
      groups.push({ kind: 'same', tile: { ...tile, from: 'both', caption } });
      continue;
    }
    const partner = unmatched[next];
    if (partner === undefined) groups.push({ kind: 'single', tile });
    else {
      groups.push({ kind: 'pair', stored: tile, file: partner });
      next += 1;
    }
  }
  for (const tile of unmatched.slice(next)) groups.push({ kind: 'single', tile });
  return groups;
}

function pixels(url: string, sizes: Sizes): number | null {
  const size = sizes.get(url);
  return size === undefined ? null : size.width * size.height;
}

/** Of a pair, the sharper one; the site's when it is not known which. */
export function sharperOf(pair: { stored: PhotoTile; file: PhotoTile }, sizes: Sizes): PhotoTile {
  const onSite = pixels(pair.stored.url, sizes);
  const inFile = pixels(pair.file.url, sizes);
  return onSite !== null && inFile !== null && inFile > onSite ? pair.file : pair.stored;
}

function isKept(
  tile: PhotoTile,
  fallback: boolean,
  overrides: Readonly<Record<string, boolean>>,
): boolean {
  return overrides[tile.id] ?? fallback;
}

/** The tiles that are kept, in the order they would be saved before any reordering. */
export function keptTiles(
  groups: readonly PhotoGroup[],
  sizes: Sizes,
  overrides: Readonly<Record<string, boolean>>,
): PhotoTile[] {
  const kept: PhotoTile[] = [];
  for (const group of groups) {
    if (group.kind === 'pair') {
      const sharper = sharperOf(group, sizes);
      for (const tile of [group.stored, group.file]) {
        if (isKept(tile, tile === sharper, overrides)) kept.push(tile);
      }
      continue;
    }
    if (isKept(group.tile, true, overrides)) kept.push(group.tile);
  }
  return kept;
}

/** The kept tiles with the person's own order laid over it: named tiles first, the rest after. */
export function orderedTiles(
  kept: readonly PhotoTile[],
  order: readonly string[] | null,
): PhotoTile[] {
  if (order === null) return [...kept];
  const rank = new Map(order.map((id, index) => [id, index]));
  const known = kept.filter((tile) => rank.has(tile.id));
  const rest = kept.filter((tile) => !rank.has(tile.id));
  return [...known.sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0)), ...rest];
}

/** Moves the tile one place; the result is the whole new order. */
export function movedOrder(ids: readonly string[], id: string, by: -1 | 1): string[] {
  const from = ids.indexOf(id);
  const to = from + by;
  if (from < 0 || to < 0 || to >= ids.length) return [...ids];
  const next = [...ids];
  next.splice(from, 1);
  next.splice(to, 0, id);
  return next;
}

/** The lineup with exactly these photos, captions travelling with their photo. */
export function withTiles(lineup: Lineup, tiles: readonly PhotoTile[]): Lineup {
  const { imageUrls: _urls, imageCaptions: _captions, ...rest } = lineup;
  if (tiles.length === 0) return rest;
  const hasCaptions = tiles.some((tile) => tile.caption !== '');
  return {
    ...rest,
    imageUrls: tiles.map((tile) => tile.url),
    ...(hasCaptions || lineup.imageCaptions !== undefined
      ? { imageCaptions: tiles.map((tile) => tile.caption) }
      : {}),
  };
}

/** Every photo of the lineup as a tile, in its own order. */
export function tilesOfLineup(lineup: Lineup): PhotoTile[] {
  return tilesOf(lineup, 'f', 'file');
}

/** The lineup without its nth photo and that photo's caption. */
export function withoutPhoto(lineup: Lineup, index: number): Lineup {
  const tiles = tilesOfLineup(lineup).filter((_tile, at) => at !== index);
  return withTiles(lineup, tiles);
}

/** The lineup without the photos whose refs are listed. */
export function withoutRefs(lineup: Lineup, refs: ReadonlySet<string>): Lineup {
  return withTiles(
    lineup,
    tilesOfLineup(lineup).filter((tile) => !refs.has(tile.url)),
  );
}

/** Keep every photo of one side, and none that only the other side has. */
export function keepSide(
  groups: readonly PhotoGroup[],
  side: 'stored' | 'file',
): Record<string, boolean> {
  const keep: Record<string, boolean> = {};
  for (const group of groups) {
    if (group.kind === 'pair') {
      keep[group.stored.id] = side === 'stored';
      keep[group.file.id] = side === 'file';
    } else if (group.kind === 'single') {
      keep[group.tile.id] = group.tile.from === side;
    } else keep[group.tile.id] = true;
  }
  return keep;
}
