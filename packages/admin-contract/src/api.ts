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
  ChangesResponse,
  CommitRequest,
  CommitResponse,
  MapId,
  MapLineupsResponse,
  PreviewRequest,
  PreviewResponse,
  Removed,
  WhoAmI,
} from './schemas';

/** The signed-in person, as Cloudflare Access names them. */
export class Actor extends Context.Service<Actor, { readonly email: string }>()(
  'disalytics/admin/Actor',
) {}

/** Verifies the Access token and provides the {@link Actor}. */
export class AccessAuth extends HttpApiMiddleware.Service<AccessAuth, { provides: Actor }>()(
  'disalytics/admin/AccessAuth',
  { error: [Unauthorized, Forbidden] },
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

const MeGroup = HttpApiGroup.make('me').add(
  HttpApiEndpoint.get('whoami', '/whoami', { success: WhoAmI }),
);

const PreviewGroup = HttpApiGroup.make('preview').add(
  HttpApiEndpoint.post('run', '/preview', {
    payload: PreviewRequest,
    success: PreviewResponse,
    error: BadRequest,
  }),
);

const CommitGroup = HttpApiGroup.make('commit').add(
  HttpApiEndpoint.post('run', '/commit', {
    payload: CommitRequest,
    success: CommitResponse,
    error: BadRequest,
  }),
);

const LineupsGroup = HttpApiGroup.make('lineups').add(
  HttpApiEndpoint.get('byMap', '/lineups/:map', {
    params: { map: MapId },
    success: MapLineupsResponse,
  }),
  HttpApiEndpoint.delete('remove', '/lineups/:id', {
    params: { id: LineupId },
    success: Removed,
    error: NotFound,
  }),
);

const ChangesGroup = HttpApiGroup.make('changes').add(
  HttpApiEndpoint.get('list', '/changes', {
    query: { map: Schema.optional(MapId) },
    success: ChangesResponse,
  }),
);

export const AdminApi = HttpApi.make('disalytics-admin')
  .add(MeGroup.prefix('/api'))
  .add(PreviewGroup.prefix('/api'))
  .add(CommitGroup.prefix('/api'))
  .add(LineupsGroup.prefix('/api'))
  .add(ChangesGroup.prefix('/api'))
  .middleware(MalformedAsBadRequest)
  .middleware(WriteGuard)
  .middleware(AccessAuth);
