import { Actor, AdminApi, notFound, type PreviewResponse } from '@disa/admin-contract';
import { Effect } from 'effect';
import { HttpApiBuilder } from 'effect/unstable/httpapi';
import { LineupStorage } from '../modules/lineups';
import { ChangeLog } from './change-log';
import { runCommit } from './commit';
import { AdminConfig } from './config';
import { lineupsOfMap } from './helpers/parse';
import { linkUrls, photoStats, planLineups, withKnownLinks } from './helpers/plan';
import { PhotoLinks } from './photo-links';

export const MeHandlers = HttpApiBuilder.group(AdminApi, 'me', (handlers) =>
  handlers.handle('whoami', () =>
    Effect.gen(function* () {
      const actor = yield* Actor;
      return { email: actor.email };
    }),
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
        items: planLineups(existing.lineups, lineups),
        photos: photoStats(lineups, config.photoBaseUrl),
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
      return yield* runCommit(payload, actor.email);
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
          actor: actor.email,
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
