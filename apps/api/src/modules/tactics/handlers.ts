import { Effect } from 'effect';
import { HttpApiBuilder, HttpApiSchema } from 'effect/unstable/httpapi';
import { Api } from '../../api';
import { TACTICS_CACHE_CONTROL } from './api';
import { TacticStorage } from './storage';

export const TacticsHandlers = HttpApiBuilder.group(Api, 'tactics', (handlers) =>
  handlers.handle('list', () =>
    Effect.gen(function* () {
      const storage = yield* TacticStorage;
      const body = yield* storage.read;
      return HttpApiSchema.withHeaders({
        body,
        headers: { etag: `"tactics-${body.revision}"`, 'cache-control': TACTICS_CACHE_CONTROL },
      });
    }).pipe(Effect.orDie),
  ),
);
