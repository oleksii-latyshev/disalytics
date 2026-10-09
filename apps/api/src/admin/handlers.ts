import {
  Actor,
  AdminApi,
  badRequest,
  forbidden,
  notFound,
  type PreviewResponse,
} from '@disa/admin-contract';
import { Effect } from 'effect';
import { HttpServerRequest, HttpServerResponse } from 'effect/unstable/http';
import { HttpApiBuilder } from 'effect/unstable/httpapi';
import { LineupStorage } from '../modules/lineups';
import { withoutSession, withSession } from './auth/cookie';
import { AdminAuth } from './auth/store';
import { deviceLabel, SESSION_COOKIE } from './auth/tokens';
import { ChangeLog } from './change-log';
import { runCommit } from './commit';
import { AdminConfig } from './config';
import { lineupsOfMap } from './helpers/parse';
import {
  linkUrls,
  photoStats,
  planLineups,
  serverOnlyLineups,
  withKnownLinks,
} from './helpers/plan';
import { PhotoLinks } from './photo-links';

const invalidInvite = badRequest('invalid_invite', 'The invite is unknown, used or expired');

export const AuthHandlers = HttpApiBuilder.group(AdminApi, 'auth', (handlers) =>
  handlers
    .handle('invite', ({ payload }) =>
      Effect.gen(function* () {
        const auth = yield* AdminAuth;
        const config = yield* AdminConfig;
        const info = yield* auth.inviteInfo(payload.token, config.now());
        if (info === null) return yield* Effect.fail(invalidInvite);
        return info;
      }).pipe(Effect.catchTag('StorageError', Effect.die)),
    )
    .handle('redeem', ({ payload }) =>
      Effect.gen(function* () {
        const auth = yield* AdminAuth;
        const config = yield* AdminConfig;
        const request = yield* HttpServerRequest.HttpServerRequest;
        const redeemed = yield* auth.redeem({
          token: payload.token,
          name: payload.name,
          label: deviceLabel(request.headers['user-agent']),
          now: config.now(),
        });
        if (!redeemed.ok) {
          return yield* Effect.fail(
            redeemed.reason === 'name_required'
              ? badRequest('name_required', 'A new person needs a name')
              : invalidInvite,
          );
        }
        const { id, name, role } = redeemed.actor;
        return withSession(HttpServerResponse.jsonUnsafe({ id, name, role }), redeemed.token);
      }).pipe(Effect.catchTag('StorageError', Effect.die)),
    )
    .handle('signOut', () =>
      Effect.gen(function* () {
        const auth = yield* AdminAuth;
        const config = yield* AdminConfig;
        const request = yield* HttpServerRequest.HttpServerRequest;
        const token = request.cookies[SESSION_COOKIE];
        if (token !== undefined && token.length > 0) yield* auth.signOut(token, config.now());
        return withoutSession(HttpServerResponse.jsonUnsafe({ ok: true }));
      }).pipe(Effect.catchTag('StorageError', Effect.die)),
    ),
);

export const MeHandlers = HttpApiBuilder.group(AdminApi, 'me', (handlers) =>
  handlers.handle('whoami', () =>
    Effect.gen(function* () {
      const { id, name, role } = yield* Actor;
      return { id, name, role };
    }),
  ),
);

/** Managing people is the owner's; an editor is refused before anything is read. */
const asOwner = Effect.gen(function* () {
  const actor = yield* Actor;
  if (actor.role !== 'owner') return yield* Effect.fail(forbidden);
  return actor;
});

export const PeopleHandlers = HttpApiBuilder.group(AdminApi, 'people', (handlers) =>
  handlers
    .handle('list', () =>
      Effect.gen(function* () {
        const actor = yield* asOwner;
        const auth = yield* AdminAuth;
        const config = yield* AdminConfig;
        return { people: yield* auth.people(actor.sessionId, config.now()) };
      }).pipe(Effect.catchTag('StorageError', Effect.die)),
    )
    .handle('invite', ({ payload }) =>
      Effect.gen(function* () {
        const actor = yield* asOwner;
        const auth = yield* AdminAuth;
        const config = yield* AdminConfig;
        const created = yield* auth.createInvite({
          role: payload.role,
          personId: payload.personId,
          createdBy: actor.name,
          now: config.now(),
        });
        if (created === null) return yield* Effect.fail(notFound);
        return created;
      }).pipe(Effect.catchTag('StorageError', Effect.die)),
    )
    .handle('revokeDevice', ({ params }) =>
      Effect.gen(function* () {
        yield* asOwner;
        const auth = yield* AdminAuth;
        const config = yield* AdminConfig;
        if (!(yield* auth.revokeDevice(params.id, config.now())))
          return yield* Effect.fail(notFound);
        return { ok: true as const };
      }).pipe(Effect.catchTag('StorageError', Effect.die)),
    )
    .handle('disable', ({ params }) =>
      Effect.gen(function* () {
        yield* asOwner;
        const auth = yield* AdminAuth;
        const config = yield* AdminConfig;
        const outcome = yield* auth.disable(params.id, config.now());
        if (outcome === 'not_found') return yield* Effect.fail(notFound);
        if (outcome === 'last_owner') {
          return yield* Effect.fail(badRequest('last_owner', 'The last owner cannot be disabled'));
        }
        return { ok: true as const };
      }).pipe(Effect.catchTag('StorageError', Effect.die)),
    ),
);

export const PreviewHandlers = HttpApiBuilder.group(AdminApi, 'preview', (handlers) =>
  handlers.handle('run', ({ payload }) =>
    Effect.gen(function* () {
      const storage = yield* LineupStorage;
      const config = yield* AdminConfig;
      const links = yield* PhotoLinks;
      const parsed = yield* lineupsOfMap(payload.file, payload.map);
      const { ignored } = parsed;
      const known = yield* links.lookup(linkUrls(parsed.lineups, config.photoBaseUrl));
      const lineups = withKnownLinks(parsed.lineups, known, config.photoBaseUrl);
      const existing = yield* storage.readMap(payload.map);
      const response: PreviewResponse = {
        map: payload.map,
        revision: existing.revision,
        items: planLineups(existing.lineups, lineups, payload.map, config.photoBaseUrl),
        serverOnly: serverOnlyLineups(existing.lineups, lineups),
        photos: photoStats(lineups, config.photoBaseUrl),
        photoBase: config.photoBaseUrl,
        ignored,
      };
      return response;
    }).pipe(Effect.catchTag('StorageError', Effect.die)),
  ),
);

export const CommitHandlers = HttpApiBuilder.group(AdminApi, 'commit', (handlers) =>
  handlers.handle('run', ({ payload }) =>
    Effect.gen(function* () {
      const actor = yield* Actor;
      return yield* runCommit(payload, actor.name);
    }).pipe(Effect.catchTag('StorageError', Effect.die)),
  ),
);

export const LineupsHandlers = HttpApiBuilder.group(AdminApi, 'lineups', (handlers) =>
  handlers
    .handle('byMap', ({ params }) =>
      Effect.gen(function* () {
        const storage = yield* LineupStorage;
        return yield* storage.readMap(params.map);
      }).pipe(Effect.catchTag('StorageError', Effect.die)),
    )
    .handle('remove', ({ params }) =>
      Effect.gen(function* () {
        const storage = yield* LineupStorage;
        const actor = yield* Actor;
        const config = yield* AdminConfig;
        const removed = yield* storage.deleteLineup({
          id: params.id,
          actor: actor.name,
          now: config.now(),
        });
        if (!removed) return yield* Effect.fail(notFound);
        return { id: params.id };
      }).pipe(Effect.catchTag('StorageError', Effect.die)),
    ),
);

export const ChangesHandlers = HttpApiBuilder.group(AdminApi, 'changes', (handlers) =>
  handlers.handle('list', ({ query }) =>
    Effect.gen(function* () {
      const log = yield* ChangeLog;
      return { changes: yield* log.recent(query.map) };
    }).pipe(Effect.catchTag('StorageError', Effect.die)),
  ),
);
