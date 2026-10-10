import { Context, Effect, Schema } from 'effect';
import { HttpApi, HttpApiEndpoint, HttpApiGroup, HttpApiMiddleware } from 'effect/unstable/httpapi';
import {
  BadRequest,
  badRequest,
  Forbidden,
  NotFound,
  PayloadTooLarge,
  Unauthorized,
} from './errors';
import {
  type AdminRole,
  ChangesResponse,
  CollectionsCommitRequest,
  CollectionsCommitResponse,
  CollectionsPreviewResponse,
  CommitRequest,
  CommitResponse,
  ContributorsResponse,
  Done,
  InviteCreated,
  InviteInfo,
  InviteRequest,
  InviteToken,
  MapId,
  MapLineupsResponse,
  PeopleResponse,
  PreviewRequest,
  PreviewResponse,
  ProfileUpdate,
  RedeemRequest,
  Removed,
  WhoAmI,
} from './schemas';

/** The signed-in person: who they are, what they may do, and which device session this is. */
export interface ActorShape {
  readonly id: string;
  readonly name: string;
  readonly role: AdminRole;
  /** Their `steamcommunity.com` profile link, when they gave one. */
  readonly steamUrl: string | null;
  /** The session this request came on; `null` for the local dev identity. */
  readonly sessionId: string | null;
}

export class Actor extends Context.Service<Actor, ActorShape>()('disalytics/admin/Actor') {}

/** Reads the device session cookie and provides the {@link Actor}. */
export class SessionAuth extends HttpApiMiddleware.Service<SessionAuth, { provides: Actor }>()(
  'disalytics/admin/SessionAuth',
  { error: Unauthorized },
) {}

/** Refuses cross-site writes, non-JSON bodies and oversized bodies. */
export class WriteGuard extends HttpApiMiddleware.Service<WriteGuard>()(
  'disalytics/admin/WriteGuard',
  { error: [Forbidden, BadRequest, PayloadTooLarge] },
) {}

/** A malformed param, query or body is a 400. */
export class MalformedAsBadRequest extends HttpApiMiddleware.Service<MalformedAsBadRequest>()(
  'disalytics/admin/MalformedAsBadRequest',
  { error: BadRequest },
) {}

export const MalformedAsBadRequestLive = HttpApiMiddleware.layerSchemaErrorTransform(
  MalformedAsBadRequest,
  () => Effect.fail(badRequest('invalid_request', 'The request does not have the expected shape')),
);

export const LineupId = Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(200));

/** Signing in and out. No session needed: this is how a device gets one. */
const AuthGroup = HttpApiGroup.make('auth').add(
  HttpApiEndpoint.post('invite', '/auth/invite', {
    payload: InviteToken,
    success: InviteInfo,
    error: BadRequest,
  }),
  HttpApiEndpoint.post('redeem', '/auth/redeem', {
    payload: RedeemRequest,
    success: WhoAmI,
    error: BadRequest,
  }),
  HttpApiEndpoint.post('signOut', '/auth/sign-out', { success: Done }),
);

const MeGroup = HttpApiGroup.make('me')
  .add(
    HttpApiEndpoint.get('whoami', '/whoami', { success: WhoAmI }),
    HttpApiEndpoint.patch('update', '/me', { payload: ProfileUpdate, success: WhoAmI }),
  )
  .middleware(SessionAuth);

/** The owner's: invites, people and their devices. */
const PeopleGroup = HttpApiGroup.make('people')
  .add(
    HttpApiEndpoint.get('list', '/people', { success: PeopleResponse, error: Forbidden }),
    HttpApiEndpoint.post('invite', '/people/invites', {
      payload: InviteRequest,
      success: InviteCreated,
      error: [Forbidden, NotFound],
    }),
    HttpApiEndpoint.delete('revokeDevice', '/people/devices/:id', {
      params: { id: Schema.String },
      success: Done,
      error: [Forbidden, NotFound],
    }),
    HttpApiEndpoint.delete('disable', '/people/:id', {
      params: { id: Schema.String },
      success: Done,
      error: [Forbidden, NotFound, BadRequest],
    }),
  )
  .middleware(SessionAuth);

const PreviewGroup = HttpApiGroup.make('preview')
  .add(
    HttpApiEndpoint.post('run', '/preview', {
      payload: PreviewRequest,
      success: PreviewResponse,
      error: BadRequest,
    }),
  )
  .middleware(SessionAuth);

const CommitGroup = HttpApiGroup.make('commit')
  .add(
    HttpApiEndpoint.post('run', '/commit', {
      payload: CommitRequest,
      success: CommitResponse,
      error: BadRequest,
    }),
  )
  .middleware(SessionAuth);

const CollectionsGroup = HttpApiGroup.make('collections')
  .add(
    HttpApiEndpoint.post('preview', '/collections/preview', {
      payload: PreviewRequest,
      success: CollectionsPreviewResponse,
      error: BadRequest,
    }),
    HttpApiEndpoint.post('commit', '/collections/commit', {
      payload: CollectionsCommitRequest,
      success: CollectionsCommitResponse,
      error: BadRequest,
    }),
    HttpApiEndpoint.delete('remove', '/collections/:id', {
      params: { id: LineupId },
      success: Removed,
      error: NotFound,
    }),
  )
  .middleware(SessionAuth);

const LineupsGroup = HttpApiGroup.make('lineups')
  .add(
    HttpApiEndpoint.get('byMap', '/lineups/:map', {
      params: { map: MapId },
      success: MapLineupsResponse,
    }),
    HttpApiEndpoint.delete('remove', '/lineups/:id', {
      params: { id: LineupId },
      success: Removed,
      error: NotFound,
    }),
  )
  .middleware(SessionAuth);

const ChangesGroup = HttpApiGroup.make('changes')
  .add(
    HttpApiEndpoint.get('list', '/changes', {
      query: { map: Schema.optional(MapId) },
      success: ChangesResponse,
    }),
  )
  .middleware(SessionAuth);

/** Who added how many live lineups; any signed-in person may read it. */
const ContributorsGroup = HttpApiGroup.make('contributors')
  .add(HttpApiEndpoint.get('list', '/contributors', { success: ContributorsResponse }))
  .middleware(SessionAuth);

export const AdminApi = HttpApi.make('disalytics-admin')
  .add(AuthGroup.prefix('/api'))
  .add(MeGroup.prefix('/api'))
  .add(PeopleGroup.prefix('/api'))
  .add(PreviewGroup.prefix('/api'))
  .add(CommitGroup.prefix('/api'))
  .add(LineupsGroup.prefix('/api'))
  .add(CollectionsGroup.prefix('/api'))
  .add(ChangesGroup.prefix('/api'))
  .add(ContributorsGroup.prefix('/api'))
  .middleware(MalformedAsBadRequest)
  .middleware(WriteGuard);
