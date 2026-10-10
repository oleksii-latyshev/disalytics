import { Schema } from 'effect';
import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from 'effect/unstable/httpapi';
import { PUBLIC_CACHE_CONTROL } from '../../shared/http/cache-control';

const TacticsBody = Schema.Struct({
  revision: Schema.Int,
  // Each entry passed `isTactic` on its way out of D1.
  tactics: Schema.Array(Schema.Unknown),
});

export const TACTICS_CACHE_CONTROL = PUBLIC_CACHE_CONTROL;

export const TacticsGroup = HttpApiGroup.make('tactics').add(
  HttpApiEndpoint.get('list', '/tactics', {
    success: HttpApiSchema.WithHeaders(TacticsBody, {
      etag: Schema.String,
      'cache-control': Schema.String,
    }),
  }),
);
