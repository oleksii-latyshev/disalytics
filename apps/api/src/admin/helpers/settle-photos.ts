import {
  type BadRequest,
  badRequest,
  MAX_PHOTOS_PER_COMMIT,
  type PhotoFailure,
} from '@disa/admin-contract';
import { isLocalImageRef, type Lineup, localImageHash, normalizeLineup } from '@disa/demo-core';
import { Effect } from 'effect';
import { PhotoStorage } from '../../modules/photos';
import type { StorageError } from '../../shared/storage-error';
import { AdminConfig } from '../config';
import { type CopiedLink, PhotoLinks } from '../photo-links';
import { decodeDataUrl } from './images';
import { fetchLinkPhoto } from './link-photos';

const OURS = /^[0-9a-f]{64}$/;
const LINK_CONCURRENCY = 4;

export interface SettledPhotos {
  /** Each ref that now lives in our storage, and the public URL it has there. */
  readonly urlByRef: ReadonlyMap<string, string>;
  readonly failures: ReadonlyMap<string, string>;
  readonly uploaded: number;
  readonly copied: number;
  readonly copiedLinks: readonly CopiedLink[];
}

function isOurs(url: string, photoBaseUrl: string): boolean {
  return url.startsWith(`${photoBaseUrl}/`) && OURS.test(url.slice(photoBaseUrl.length + 1));
}

/** The refs of these lineups that are not in our storage yet, without repeats. */
export function photoRefsToStore(lineups: readonly Lineup[], photoBaseUrl: string): string[] {
  const refs = new Set<string>();
  for (const lineup of lineups) {
    for (const url of lineup.imageUrls ?? []) if (!isOurs(url, photoBaseUrl)) refs.add(url);
  }
  return [...refs];
}

function storeEmbedded(
  ref: string,
  images: Readonly<Record<string, string>>,
): Effect.Effect<{ url: string } | { reason: string }, StorageError, PhotoStorage | AdminConfig> {
  return Effect.gen(function* () {
    const photos = yield* PhotoStorage;
    const config = yield* AdminConfig;
    const hash = localImageHash(ref);
    const dataUrl = hash === null ? undefined : images[hash];
    if (hash === null || dataUrl === undefined) return { reason: 'missing' };
    const decoded = decodeDataUrl(dataUrl);
    if (!decoded.ok) return { reason: decoded.reason };
    const stored = yield* photos.save(decoded.bytes, decoded.type);
    return { url: `${config.photoBaseUrl}/${stored}` };
  });
}

function storeLink(
  link: string,
): Effect.Effect<
  { url: string; sha256: string } | { reason: string },
  StorageError,
  PhotoStorage | AdminConfig
> {
  return Effect.gen(function* () {
    const photos = yield* PhotoStorage;
    const config = yield* AdminConfig;
    const fetchPhoto = config.fetchPhoto ?? ((url: string) => fetchLinkPhoto(url));
    const result = yield* Effect.promise(() => fetchPhoto(link));
    if (!result.ok) return { reason: result.reason };
    const sha256 = yield* photos.save(result.bytes, result.type);
    return { url: `${config.photoBaseUrl}/${sha256}`, sha256 };
  });
}

type Stored = { url: string } | { reason: string };

function uploadAll(
  refs: readonly string[],
  images: Readonly<Record<string, string>>,
  out: Mutable,
): Effect.Effect<void, StorageError, PhotoStorage | AdminConfig> {
  return Effect.gen(function* () {
    for (const ref of refs) {
      const stored: Stored = yield* storeEmbedded(ref, images);
      if ('url' in stored) {
        out.urlByRef.set(ref, stored.url);
        out.uploaded += 1;
      } else out.failures.set(ref, stored.reason);
    }
  });
}

function copyAll(
  links: readonly string[],
  out: Mutable,
): Effect.Effect<void, StorageError, PhotoStorage | PhotoLinks | AdminConfig> {
  return Effect.gen(function* () {
    const known = yield* (yield* PhotoLinks).lookup(links);
    const { photoBaseUrl } = yield* AdminConfig;
    const toFetch: string[] = [];
    for (const link of links) {
      const sha = known.get(link);
      if (sha === undefined) toFetch.push(link);
      else out.urlByRef.set(link, `${photoBaseUrl}/${sha}`);
    }
    const results = yield* Effect.forEach(toFetch, storeLink, { concurrency: LINK_CONCURRENCY });
    for (const [index, result] of results.entries()) {
      const link = toFetch[index];
      if (link === undefined) continue;
      if ('url' in result) {
        out.urlByRef.set(link, result.url);
        out.copiedLinks.push({ url: link, sha256: result.sha256 });
      } else out.failures.set(link, result.reason);
    }
  });
}

interface Mutable {
  readonly urlByRef: Map<string, string>;
  readonly failures: Map<string, string>;
  readonly copiedLinks: CopiedLink[];
  uploaded: number;
}

/**
 * Puts every photo of these lineups into our storage: embedded ones are uploaded, links are
 * fetched by the Worker (a link copied before is not fetched again). A photo that cannot be
 * stored is reported, not fatal; the caller decides what to do with the lineups that use it.
 */
export function settlePhotos(
  refs: readonly string[],
  images: Readonly<Record<string, string>>,
): Effect.Effect<
  SettledPhotos,
  BadRequest | StorageError,
  PhotoStorage | PhotoLinks | AdminConfig
> {
  return Effect.gen(function* () {
    if (refs.length > MAX_PHOTOS_PER_COMMIT) {
      return yield* Effect.fail(
        badRequest(
          'too_many_photos',
          `At most ${MAX_PHOTOS_PER_COMMIT} photos per commit; send fewer lineups at once`,
        ),
      );
    }
    const out: Mutable = {
      urlByRef: new Map(),
      failures: new Map(),
      copiedLinks: [],
      uploaded: 0,
    };
    yield* uploadAll(refs.filter(isLocalImageRef), images, out);
    yield* copyAll(
      refs.filter((ref) => !isLocalImageRef(ref)),
      out,
    );
    return { ...out, copied: out.copiedLinks.length };
  });
}

/** The lineup with each photo ref swapped for its public URL, in the shape storage keeps. */
export function withStoredPhotos(lineup: Lineup, urlByRef: ReadonlyMap<string, string>): Lineup {
  if (lineup.imageUrls === undefined) return normalizeLineup(lineup);
  return normalizeLineup({
    ...lineup,
    imageUrls: lineup.imageUrls.map((url) => urlByRef.get(url) ?? url),
  });
}

/** The photos of this lineup that could not be stored, with why. */
export function failuresOf(lineup: Lineup, failures: ReadonlyMap<string, string>): PhotoFailure[] {
  const found: PhotoFailure[] = [];
  for (const ref of new Set(lineup.imageUrls ?? [])) {
    const reason = failures.get(ref);
    if (reason !== undefined) found.push({ ref, reason });
  }
  return found;
}
