import { LINEUP_TAGS } from '@disa/demo-core';
import { Schema } from 'effect';
import { MAX_STEAM_URL_LENGTH, STEAM_URL_PATTERN } from './steam-url';
import { COLLECTION_PROBLEM_CODES, PROBLEM_CODES } from './validation';

/** World units within which two lineups of one map, kind and side count as the same throw. */
export const DUPLICATE_RADIUS = 48;

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

/** A side that has no value for the field leaves its key out. */
export const FieldDiff = Schema.Struct({
  field: Schema.String,
  before: Schema.optionalKey(Schema.Unknown),
  after: Schema.optionalKey(Schema.Unknown),
});
export type FieldDiff = typeof FieldDiff.Type;

export const ProblemSchema = Schema.Struct({
  code: Schema.Literals(PROBLEM_CODES),
  index: Schema.optionalKey(Schema.Int),
});

/**
 * One lineup of the file against the map. `lineup` and `stored` are full lineups (they passed
 * `isLineup`; the wire keeps them opaque). `stored` is the lineup this one updates or may duplicate.
 */
export const PreviewItem = Schema.Struct({
  id: Schema.String,
  status: PreviewStatus,
  lineup: Schema.Unknown,
  stored: Schema.optionalKey(Schema.Unknown),
  diff: Schema.optionalKey(Schema.Array(FieldDiff)),
  /** What stops `lineup` from being saved as it is; empty when nothing does. */
  problems: Schema.Array(ProblemSchema),
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
  /** Stored lineups of the map whose id is not in the file. */
  serverOnly: Schema.Array(Schema.Unknown),
  photos: PhotoStats,
  /** Where our stored photos are served from, no trailing slash. */
  photoBase: Schema.String,
  /** Lineups of the file that belong to another map. */
  ignored: Schema.Int,
});
export type PreviewResponse = typeof PreviewResponse.Type;

export const DecisionAction = Schema.Literals(['add', 'replace', 'skip']);
export type DecisionAction = typeof DecisionAction.Type;

/**
 * What the page decided for one lineup, with the lineup exactly as it should be saved. `replace`
 * names the stored lineup it takes the place of; the saved lineup keeps that id. A photo ref in
 * `lineup.imageUrls` is one of our stored photos, a `local:` ref the request carries in `images`,
 * or an https link the Worker fetches and stores.
 */
export const CommitDecision = Schema.Struct({
  action: DecisionAction,
  targetId: Schema.optionalKey(Schema.String),
  /** The id the lineup had in the file, when a replace merges it into a stored lineup with another id. */
  sourceId: Schema.optionalKey(Schema.String),
  lineup: Schema.optionalKey(Schema.Unknown),
});
export type CommitDecision = typeof CommitDecision.Type;

export const CommitRequest = Schema.Struct({
  map: MapId,
  decisions: Schema.Array(CommitDecision),
  /** Lowercase hex SHA-256 → `data:image/…;base64,…`, for the `local:` refs the decisions use. */
  images: Schema.Record(Schema.String, Schema.String),
});
export type CommitRequest = typeof CommitRequest.Type;

export const PhotoFailure = Schema.Struct({ ref: Schema.String, reason: Schema.String });
export type PhotoFailure = typeof PhotoFailure.Type;

/** A lineup that was not saved because some of its photos could not be stored. */
export const WithheldLineup = Schema.Struct({
  id: Schema.String,
  failures: Schema.Array(PhotoFailure),
});
export type WithheldLineup = typeof WithheldLineup.Type;

export const CommitResponse = Schema.Struct({
  map: Schema.String,
  revision: Schema.Int,
  saved: Schema.Int,
  skipped: Schema.Int,
  photos: Schema.Struct({ uploaded: Schema.Int, copied: Schema.Int }),
  withheld: Schema.Array(WithheldLineup),
});
export type CommitResponse = typeof CommitResponse.Type;

export const CollectionStatus = Schema.Literals(['new', 'update', 'unchanged']);
export type CollectionStatus = typeof CollectionStatus.Type;

/**
 * One collection of the file against the map's collections on the site. Its lineup ids are the
 * file's; `collection` is the same with each id resolved to a lineup on the site (the id itself, or
 * the one it was merged into), which is what a commit would store.
 */
export const CollectionPreviewItem = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  status: CollectionStatus,
  /** The collection with its lineup ids resolved; `isLineupCollection` holds. */
  collection: Schema.Unknown,
  /** The collection on the site with the same id. */
  stored: Schema.optionalKey(Schema.Unknown),
  /** Resolved lineup ids the site's collection does not hold. */
  added: Schema.Array(Schema.String),
  /** Lineup ids the site's collection holds that the resolved one does not. */
  removed: Schema.Array(Schema.String),
  /** Members of the file that no lineup on the site answers to. */
  dropped: Schema.Int,
  problems: Schema.Array(Schema.Literals(COLLECTION_PROBLEM_CODES)),
});
export type CollectionPreviewItem = typeof CollectionPreviewItem.Type;

export const CollectionsPreviewResponse = Schema.Struct({
  map: Schema.String,
  revision: Schema.Int,
  items: Schema.Array(CollectionPreviewItem),
  /** Collections of the file that belong to another map. */
  ignored: Schema.Int,
});
export type CollectionsPreviewResponse = typeof CollectionsPreviewResponse.Type;

/** `replace` takes the place of the site's collection with the same id. */
export const CollectionDecision = Schema.Struct({
  action: DecisionAction,
  /** The collection as the file has it; the Worker resolves its lineup ids. */
  collection: Schema.Unknown,
});
export type CollectionDecision = typeof CollectionDecision.Type;

export const CollectionsCommitRequest = Schema.Struct({
  map: MapId,
  decisions: Schema.Array(CollectionDecision),
});
export type CollectionsCommitRequest = typeof CollectionsCommitRequest.Type;

export const CollectionsCommitResponse = Schema.Struct({
  map: Schema.String,
  revision: Schema.Int,
  saved: Schema.Int,
  skipped: Schema.Int,
  /** Members left out of the saved collections because no lineup on the site answers to them. */
  dropped: Schema.Int,
});
export type CollectionsCommitResponse = typeof CollectionsCommitResponse.Type;

export const MapLineupsResponse = Schema.Struct({
  map: Schema.String,
  revision: Schema.Int,
  lineups: Schema.Array(Schema.Unknown),
  collections: Schema.Array(Schema.Unknown),
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

/** `owner` invites people and manages devices; `editor` edits lineups. */
export const ADMIN_ROLES = ['owner', 'editor'] as const;
export const AdminRole = Schema.Literals(ADMIN_ROLES);
export type AdminRole = typeof AdminRole.Type;

export const MAX_NAME_LENGTH = 60;
export const PersonName = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(MAX_NAME_LENGTH),
);

/** An invite or session token as it travels: 32 random bytes, base64url. */
export const Token = Schema.String.check(Schema.isPattern(/^[A-Za-z0-9_-]{43}$/));

export const SteamUrl = Schema.String.check(
  Schema.isMaxLength(MAX_STEAM_URL_LENGTH),
  Schema.isPattern(STEAM_URL_PATTERN),
);

export const WhoAmI = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  role: AdminRole,
  steamUrl: Schema.optional(SteamUrl),
});
export type WhoAmI = typeof WhoAmI.Type;

export const InviteToken = Schema.Struct({ token: Token });

/** What an invite will do, read without spending it. `name` is set when it adds a device. */
export const InviteInfo = Schema.Struct({
  role: AdminRole,
  name: Schema.optional(Schema.String),
  /** Who made the link, when that is a person. */
  invitedBy: Schema.optional(Schema.String),
  expiresAt: Schema.Number,
});
export type InviteInfo = typeof InviteInfo.Type;

/**
 * Spends an invite. A new person's invite needs `name` and may carry `steamUrl`; a device invite
 * ignores both.
 */
export const RedeemRequest = Schema.Struct({
  token: Token,
  name: Schema.optional(PersonName),
  steamUrl: Schema.optional(SteamUrl),
});

/** A person's own profile edit; `null` clears the Steam link. */
export const ProfileUpdate = Schema.Struct({ steamUrl: Schema.NullOr(SteamUrl) });

/** An owner asks for a link: for a new person of `role`, or for one more device of `personId`. */
export const InviteRequest = Schema.Struct({
  role: AdminRole,
  personId: Schema.optional(Schema.String),
});

export const InviteCreated = Schema.Struct({ token: Token, expiresAt: Schema.Number });
export type InviteCreated = typeof InviteCreated.Type;

export const Device = Schema.Struct({
  id: Schema.String,
  label: Schema.String,
  createdAt: Schema.Number,
  lastSeenAt: Schema.Number,
  current: Schema.Boolean,
});
export type Device = typeof Device.Type;

export const Person = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  role: AdminRole,
  createdAt: Schema.Number,
  disabled: Schema.Boolean,
  devices: Schema.Array(Device),
});
export type Person = typeof Person.Type;

export const PeopleResponse = Schema.Struct({ people: Schema.Array(Person) });
export type PeopleResponse = typeof PeopleResponse.Type;

export const Done = Schema.Struct({ ok: Schema.Literal(true) });

export const Removed = Schema.Struct({ id: Schema.String });

/** One person's live lineups, in all and per map. Names with no admin (the seed) are listed too. */
export const Contributor = Schema.Struct({
  name: Schema.String,
  steamUrl: Schema.optional(SteamUrl),
  total: Schema.Int,
  byMap: Schema.Record(Schema.String, Schema.Int),
});
export type Contributor = typeof Contributor.Type;

export const ContributorsResponse = Schema.Struct({ contributors: Schema.Array(Contributor) });
export type ContributorsResponse = typeof ContributorsResponse.Type;
