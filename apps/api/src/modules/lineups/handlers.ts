import { Effect } from 'effect';
import { HttpApiBuilder, HttpApiSchema } from 'effect/unstable/httpapi';
import { Api } from '../../api';
import { LINEUPS_CACHE_CONTROL } from './api';
import { LineupStorage } from './storage';

export const LineupsHandlers = HttpApiBuilder.group(Api, 'lineups', (handlers) =>
  handlers
    .handle('summary', () =>
      Effect.gen(function* () {
        const storage = yield* LineupStorage;
        const maps = yield* storage.summary;
        return HttpApiSchema.withHeaders({
          body: { maps },
          headers: { 'cache-control': LINEUPS_CACHE_CONTROL },
        });
      }).pipe(Effect.orDie),
    )
    .handle('byMap', ({ params }) =>
      Effect.gen(function* () {
        const storage = yield* LineupStorage;
        const body = yield* storage.readMap(params.map);
        return HttpApiSchema.withHeaders({
          body,
          headers: {
            etag: `"${body.map}-${body.revision}"`,
            'cache-control': LINEUPS_CACHE_CONTROL,
          },
        });
      }).pipe(Effect.orDie),
    ),
);
