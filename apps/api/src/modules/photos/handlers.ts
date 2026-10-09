import { Effect, Option } from 'effect';
import { HttpApiBuilder, HttpApiSchema } from 'effect/unstable/httpapi';
import { Api } from '../../api';
import { notFound } from '../../shared/errors';
import { PHOTO_CACHE_CONTROL } from './api';
import { PhotoStorage } from './storage';

export const PhotosHandlers = HttpApiBuilder.group(Api, 'photos', (handlers) =>
  handlers.handle('byHash', ({ params }) =>
    Effect.gen(function* () {
      const storage = yield* PhotoStorage;
      const photo = Option.getOrUndefined(yield* storage.read(params.sha256));
      if (photo === undefined) return yield* Effect.fail(notFound);
      return HttpApiSchema.withHeaders({
        body: photo.bytes,
        headers: {
          'content-type': photo.contentType,
          etag: `"${params.sha256}"`,
          'cache-control': PHOTO_CACHE_CONTROL,
          'x-content-type-options': 'nosniff',
        },
      });
    }).pipe(Effect.catchTag('StorageError', Effect.die)),
  ),
);
