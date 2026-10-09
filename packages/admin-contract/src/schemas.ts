import { LINEUP_TAGS } from '@disa/demo-core';
import { Schema } from 'effect';

/** World units within which two lineups of one map, kind and side count as the same throw. */
export const DUPLICATE_RADIUS = 48;

export const MAX_TITLE_LENGTH = 120;

/**
 * Photo operations one commit may start. Each upload is a KV write and each copied link a fetch
 * plus a write, and a Worker request may make only so many subrequests on the free plan; the page
 * splits a larger import into several commits to stay under it.
 */
export const MAX_PHOTOS_PER_COMMIT = 24;

export const MapId = Schema.String.check(Schema.isPattern(/^de_[a-z0-9_]{1,40}$/));

export const LineupTagSchema = Schema.Literals(LINEUP_TAGS);

export const PreviewStatus = Schema.Literals(['new', 'update', 'duplicate', 'unchanged']);
export type PreviewStatus = typeof PreviewStatus.Type;

export const FieldDiff = Schema.Struct({
  field: Schema.String,
  before: Schema.Unknown,
  after: Schema.Unknown,
});
export type FieldDiff = typeof FieldDiff.Type;

/** `lineup` is a full lineup (it passed `isLineup` on the way in); the wire keeps it opaque. */
export const PreviewItem = Schema.Struct({
  id: Schema.String,
  status: PreviewStatus,
  lineup: Schema.Unknown,
  diff: Schema.optionalKey(Schema.Array(FieldDiff)),
  candidate: Schema.optionalKey(Schema.Struct({ id: Schema.String, title: Schema.String })),
});
export type PreviewItem = typeof PreviewItem.Type;

export const PhotoStats = Schema.Struct({
  /** Distinct `local:` photos the lineups of the chosen map embed. */
  embedded: Schema.Int,
  /** Distinct `http(s)` photo links. */
  links: Schema.Int,
  /** Links that already point at our storage. */
  ours: Schema.Int,
});
export type PhotoStats = typeof PhotoStats.Type;

export const PreviewRequest = Schema.Struct({ map: MapId, file: Schema.Unknown });
export type PreviewRequest = typeof PreviewRequest.Type;

export const PreviewResponse = Schema.Struct({
  map: Schema.String,
  revision: Schema.Int,
  items: Schema.Array(PreviewItem),
  photos: PhotoStats,
  /** Lineups of the file that belong to another map. */
  ignored: Schema.Int,
});
export type PreviewResponse = typeof PreviewResponse.Type;

export const ResolutionAction = Schema.Literals(['add', 'replace', 'keep-both', 'skip']);
export type ResolutionAction = typeof ResolutionAction.Type;

export const Resolution = Schema.Struct({
  id: Schema.String,
  action: ResolutionAction,
  title: Schema.optionalKey(Schema.String),
  tags: Schema.optionalKey(Schema.Array(LineupTagSchema)),
});
export type Resolution = typeof Resolution.Type;

export const CommitRequest = Schema.Struct({
  map: MapId,
  file: Schema.Unknown,
  resolutions: Schema.Array(Resolution),
  copyLinkPhotos: Schema.Boolean,
});
export type CommitRequest = typeof CommitRequest.Type;

export const LinkPhotoFailure = Schema.Struct({ url: Schema.String, reason: Schema.String });
export type LinkPhotoFailure = typeof LinkPhotoFailure.Type;

export const CommitResponse = Schema.Struct({
  map: Schema.String,
  revision: Schema.Int,
  saved: Schema.Int,
  skipped: Schema.Int,
  photos: Schema.Struct({
    uploaded: Schema.Int,
    copied: Schema.Int,
    failed: Schema.Array(LinkPhotoFailure),
  }),
});
export type CommitResponse = typeof CommitResponse.Type;

export const MapLineupsResponse = Schema.Struct({
  map: Schema.String,
  revision: Schema.Int,
  lineups: Schema.Array(Schema.Unknown),
});
export type MapLineupsResponse = typeof MapLineupsResponse.Type;

export const ChangeEntry = Schema.Struct({
  id: Schema.Int,
  lineupId: Schema.String,
  map: Schema.String,
  action: Schema.String,
  actor: Schema.String,
  at: Schema.Number,
});
export type ChangeEntry = typeof ChangeEntry.Type;

export const ChangesResponse = Schema.Struct({ changes: Schema.Array(ChangeEntry) });
export type ChangesResponse = typeof ChangesResponse.Type;

export const WhoAmI = Schema.Struct({ email: Schema.String });
export type WhoAmI = typeof WhoAmI.Type;

export const Removed = Schema.Struct({ id: Schema.String });
