import {
  type BadRequest,
  badRequest,
  type CommitRequest,
  type CommitResponse,
  type LinkPhotoFailure,
  MAX_PHOTOS_PER_COMMIT,
  type Resolution,
} from '@disa/admin-contract';
import {
  isLineup,
  isLocalImageRef,
  type Lineup,
  type LineupTag,
  localImageHash,
  normalizeLineup,
} from '@disa/demo-core';
import { Effect } from 'effect';
import { LineupStorage } from '../modules/lineups';
import { PhotoStorage } from '../modules/photos';
import type { StorageError } from '../shared/storage-error';
import { AdminConfig } from './config';
import { decodeDataUrl } from './helpers/images';
import { fetchLinkPhoto } from './helpers/link-photos';
import { checkResolutions, parseCommitFile } from './helpers/parse';
import { type PlanItem, planLineups } from './helpers/plan';

interface Planned {
  readonly item: PlanItem;
  readonly resolution: Resolution;
}

const ALLOWED: Readonly<Record<PlanItem['status'], readonly Resolution['action'][]>> = {
  new: ['add', 'skip'],
  duplicate: ['add', 'replace', 'skip'],
  update: ['replace', 'keep-both', 'skip'],
  unchanged: ['skip'],
};

function resolutionFor(
  item: PlanItem,
  byId: ReadonlyMap<string, Resolution>,
): Effect.Effect<Resolution, BadRequest> {
  const resolution =
    byId.get(item.id) ??
    (item.status === 'unchanged' ? { id: item.id, action: 'skip' as const } : undefined);
  if (resolution === undefined) {
    return Effect.fail(badRequest('missing_resolution', `${item.id} needs a decision`));
  }
  if (!ALLOWED[item.status].includes(resolution.action)) {
    return Effect.fail(
      badRequest(
        'invalid_resolutions',
        `${resolution.action} is not possible for a ${item.status} lineup (${item.id})`,
      ),
    );
  }
  return Effect.succeed(resolution);
}

function pair(
  items: readonly PlanItem[],
  resolutions: readonly Resolution[],
): Effect.Effect<Planned[], BadRequest> {
  return Effect.gen(function* () {
    const known = new Set(items.map((item) => item.id));
    for (const resolution of resolutions) {
      if (!known.has(resolution.id)) {
        return yield* Effect.fail(
          badRequest('invalid_resolutions', `${resolution.id} is not in the file`),
        );
      }
    }
    const byId = new Map(resolutions.map((resolution) => [resolution.id, resolution]));
    const planned: Planned[] = [];
    for (const item of items) {
      planned.push({ item, resolution: yield* resolutionFor(item, byId) });
    }
    return planned;
  });
}

function freshId(base: string, taken: ReadonlySet<string>): string {
  for (;;) {
    const candidate = `${base}-${crypto.randomUUID().slice(0, 8)}`;
    if (!taken.has(candidate)) return candidate;
  }
}

function edited(lineup: Lineup, resolution: Resolution): Lineup {
  const titled: Lineup =
    resolution.title === undefined ? lineup : { ...lineup, title: resolution.title };
  if (resolution.tags === undefined) return titled;
  const { tags: _previous, ...rest } = titled;
  const tags: readonly LineupTag[] = resolution.tags;
  return tags.length === 0 ? rest : { ...rest, tags };
}

function withoutBuiltInFlag(lineup: Lineup): Lineup {
  const { isBuiltIn: _flag, ...rest } = lineup;
  return rest;
}

/** The lineups a commit will write, ids settled and edits applied; photo URLs are still the file's. */
function selectWrites(
  planned: readonly Planned[],
  existing: readonly Lineup[],
): { writes: Lineup[]; skipped: number } {
  const taken = new Set([...existing.map((l) => l.id), ...planned.map(({ item }) => item.id)]);
  const writes: Lineup[] = [];
  let skipped = 0;
  for (const { item, resolution } of planned) {
    if (resolution.action === 'skip') {
      skipped += 1;
      continue;
    }
    let id = item.id;
    if (resolution.action === 'keep-both') {
      id = freshId(item.id, taken);
      taken.add(id);
    } else if (resolution.action === 'replace' && item.candidate !== undefined) {
      id = item.candidate.id;
    }
    writes.push(edited({ ...withoutBuiltInFlag(item.lineup), id }, resolution));
  }
  return { writes, skipped };
}

interface PhotoOutcome {
  readonly urlByRef: Map<string, string>;
  readonly uploaded: number;
  readonly copied: number;
  readonly failed: LinkPhotoFailure[];
}

interface Embedded {
  readonly ref: string;
  readonly photo: Extract<ReturnType<typeof decodeDataUrl>, { ok: true }>;
}

function decodeOne(
  ref: string,
  images: Readonly<Record<string, string>>,
): Effect.Effect<Embedded, BadRequest> {
  const hash = localImageHash(ref);
  const dataUrl = hash === null ? undefined : images[hash];
  const photo = dataUrl === undefined ? null : decodeDataUrl(dataUrl);
  if (photo?.ok === true) return Effect.succeed({ ref, photo });
  const reason = photo === null ? 'missing' : photo.reason;
  return Effect.fail(badRequest('invalid_photo', `Photo ${hash ?? ref} is not usable: ${reason}`));
}

function decodeEmbedded(
  refs: readonly string[],
  images: Readonly<Record<string, string>>,
): Effect.Effect<Embedded[], BadRequest> {
  return Effect.all(refs.map((ref) => decodeOne(ref, images)));
}

function copyLinks(
  links: readonly string[],
  urlByRef: Map<string, string>,
): Effect.Effect<
  { copied: number; failed: LinkPhotoFailure[] },
  StorageError,
  PhotoStorage | AdminConfig
> {
  return Effect.gen(function* () {
    const photos = yield* PhotoStorage;
    const config = yield* AdminConfig;
    const fetchPhoto = config.fetchPhoto ?? ((url: string) => fetchLinkPhoto(url));
    const failed: LinkPhotoFailure[] = [];
    let copied = 0;
    for (const link of links) {
      const result = yield* Effect.promise(() => fetchPhoto(link));
      if (!result.ok) {
        failed.push({ url: link, reason: result.reason });
        continue;
      }
      const hash = yield* photos.save(result.bytes, result.type);
      urlByRef.set(link, `${config.photoBaseUrl}/${hash}`);
      copied += 1;
    }
    return { copied, failed };
  });
}

function settlePhotos(
  writes: readonly Lineup[],
  images: Readonly<Record<string, string>>,
  copyLinkPhotos: boolean,
): Effect.Effect<PhotoOutcome, BadRequest | StorageError, PhotoStorage | AdminConfig> {
  return Effect.gen(function* () {
    const photos = yield* PhotoStorage;
    const config = yield* AdminConfig;

    const refs = new Set<string>();
    for (const lineup of writes) for (const url of lineup.imageUrls ?? []) refs.add(url);
    const embedded = [...refs].filter(isLocalImageRef);
    const links = copyLinkPhotos
      ? [...refs].filter(
          (url) => !isLocalImageRef(url) && !url.startsWith(`${config.photoBaseUrl}/`),
        )
      : [];
    if (embedded.length + links.length > MAX_PHOTOS_PER_COMMIT) {
      return yield* Effect.fail(
        badRequest(
          'too_many_photos',
          `At most ${MAX_PHOTOS_PER_COMMIT} photos per commit; send fewer lineups at once`,
        ),
      );
    }

    // Everything embedded is decoded before anything is stored, so a bad photo writes nothing.
    const decoded = yield* decodeEmbedded(embedded, images);
    const urlByRef = new Map<string, string>();
    for (const { ref, photo } of decoded) {
      const hash = yield* photos.save(photo.bytes, photo.type);
      urlByRef.set(ref, `${config.photoBaseUrl}/${hash}`);
    }
    const { copied, failed } = yield* copyLinks(links, urlByRef);
    return { urlByRef, uploaded: decoded.length, copied, failed };
  });
}

function rewritten(lineup: Lineup, urlByRef: ReadonlyMap<string, string>): Lineup {
  const moved =
    lineup.imageUrls === undefined
      ? lineup
      : { ...lineup, imageUrls: lineup.imageUrls.map((url) => urlByRef.get(url) ?? url) };
  return normalizeLineup(moved);
}

/**
 * Applies the owner's decisions. The server recomputes every lineup's status itself, so a stale or
 * forged client cannot write something the preview would not have allowed.
 */
export function runCommit(
  request: CommitRequest,
  actor: string,
): Effect.Effect<
  CommitResponse,
  BadRequest | StorageError,
  LineupStorage | PhotoStorage | AdminConfig
> {
  return Effect.gen(function* () {
    const storage = yield* LineupStorage;
    const config = yield* AdminConfig;
    const { map } = request;

    const file = yield* parseCommitFile(request.file, map);
    const resolutions = yield* checkResolutions(request.resolutions);
    const existing = yield* storage.readMap(map);
    const items = planLineups(existing.lineups, file.lineups);
    const planned = yield* pair(items, resolutions);
    const { writes, skipped } = selectWrites(planned, existing.lineups);

    const photos = yield* settlePhotos(writes, file.images, request.copyLinkPhotos);
    const final = writes.map((lineup) => rewritten(lineup, photos.urlByRef));
    for (const lineup of final) {
      const candidate: unknown = lineup;
      if (!isLineup(candidate)) {
        return yield* Effect.fail(badRequest('invalid_lineup', `Lineup ${lineup.id} is not valid`));
      }
    }

    yield* storage.saveLineups({ lineups: final, actor, now: config.now() });
    const { revision } = yield* storage.readMap(map);
    return {
      map,
      revision,
      saved: final.length,
      skipped,
      photos: { uploaded: photos.uploaded, copied: photos.copied, failed: photos.failed },
    };
  });
}
