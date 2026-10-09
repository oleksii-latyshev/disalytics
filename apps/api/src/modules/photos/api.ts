import { Schema } from 'effect';
import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from 'effect/unstable/httpapi';
import { NotFound } from '../../shared/errors';

/** Lowercase hex SHA-256. */
export const PhotoHash = Schema.String.check(Schema.isPattern(/^[0-9a-f]{64}$/));

export const PHOTO_CACHE_CONTROL = 'public, max-age=31536000, immutable';

export const PhotosGroup = HttpApiGroup.make('photos').add(
  HttpApiEndpoint.get('byHash', '/photos/:sha256', {
    params: { sha256: PhotoHash },
    success: HttpApiSchema.WithHeaders(Schema.Uint8Array.pipe(HttpApiSchema.asUint8Array()), {
      'content-type': Schema.String,
      etag: Schema.String,
      'cache-control': Schema.String,
      'x-content-type-options': Schema.String,
    }),
    error: NotFound,
  }),
);
